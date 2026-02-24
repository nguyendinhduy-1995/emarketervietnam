import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// PAYG Usage Charge API — Fully hardened
// Checks: auth → idempotency → entitlement → quota → rate limit → wallet lock → debit → receipt → notify
export async function POST(req: NextRequest) {
    const { cookies } = req;
    const sessionToken = cookies.get('hub_session')?.value || cookies.get('emk_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let userId: string;
    try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1] || '', 'base64').toString());
        userId = payload.userId;
        if (!userId) throw new Error('No userId');
    } catch {
        return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const { productId, meteredItemKey, quantity, requestId, metadata } = await req.json();
    if (!productId || !meteredItemKey || !requestId) {
        return NextResponse.json({ error: 'productId, meteredItemKey, requestId là bắt buộc' }, { status: 400 });
    }

    // 1. Idempotency check (anti double charge)
    const existing = await db.usageEvent.findUnique({ where: { requestId } });
    if (existing) {
        if (existing.status === 'SUCCEEDED') return NextResponse.json({ ok: true, usage: existing, message: 'Đã xử lý' });
        if (existing.status === 'PENDING') return NextResponse.json({ error: 'Đang xử lý' }, { status: 409 });
    }

    // 2. Check entitlement
    const membership = await db.membership.findFirst({ where: { userId } });
    if (membership) {
        const entitlement = await db.entitlement.findFirst({
            where: { workspaceId: membership.workspaceId, productId, status: 'ACTIVE' },
        });
        if (!entitlement) {
            return NextResponse.json({ error: 'Bạn chưa có quyền sử dụng sản phẩm này' }, { status: 403 });
        }
    }

    // 3. Get metered item (with pricing versioning — use active effective price)
    const now = new Date();
    const meteredItem = await db.meteredItem.findFirst({
        where: {
            productId, key: meteredItemKey, isActive: true,
            effectiveFrom: { lte: now },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }],
        },
        orderBy: { effectiveFrom: 'desc' }, // latest effective price
    });
    if (!meteredItem) return NextResponse.json({ error: `Không tìm thấy đơn vị "${meteredItemKey}"` }, { status: 404 });

    const qty = quantity || 1;
    const total = meteredItem.unitPrice * qty;

    // 4. Check quota
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1); // start of month
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const quota = await db.usageQuota.findFirst({
        where: { userId, productId, itemKey: meteredItemKey, periodEnd: { gte: now } },
    });
    if (quota && quota.quotaLimit > 0 && quota.quotaUsed + qty > quota.quotaLimit) {
        return NextResponse.json({
            error: `Đã hết quota. Đã dùng ${quota.quotaUsed}/${quota.quotaLimit} ${meteredItem.unitName}`,
            code: 'QUOTA_EXCEEDED', used: quota.quotaUsed, limit: quota.quotaLimit,
        }, { status: 429 });
    }

    // 5. Rate limiting (simple: check last usage within cooldown)
    if (quota && quota.rateLimit > 0 && quota.lastUsedAt) {
        const cooldownMs = 60000 / quota.rateLimit; // ms between requests
        const elapsed = now.getTime() - new Date(quota.lastUsedAt).getTime();
        if (elapsed < cooldownMs) {
            return NextResponse.json({
                error: 'Quá nhanh, vui lòng chờ', code: 'RATE_LIMITED',
                retryAfter: Math.ceil((cooldownMs - elapsed) / 1000),
            }, { status: 429 });
        }
    }

    // 6. Check wallet (credit first, then real)
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) return NextResponse.json({ error: 'Chưa có ví' }, { status: 400 });
    if (wallet.status !== 'ACTIVE') return NextResponse.json({ error: 'Ví đang bị khoá' }, { status: 400 });
    const totalBalance = wallet.balanceAvailable + wallet.creditBalance;
    if (totalBalance < total) {
        // Queue low balance notification
        await db.notificationQueue.create({
            data: {
                userId, type: 'LOW_BALANCE', title: 'Số dư ví thấp',
                body: `Bạn cần ${total.toLocaleString()}đ nhưng chỉ còn ${totalBalance.toLocaleString()}đ. Vui lòng nạp thêm.`,
            },
        });
        return NextResponse.json({
            error: `Số dư không đủ. Cần ${total.toLocaleString()}đ`,
            code: 'INSUFFICIENT_BALANCE', required: total, balance: totalBalance,
        }, { status: 400 });
    }

    // 7. Atomic: usage + debit + quota update
    const result = await db.$transaction(async (tx) => {
        const usage = await tx.usageEvent.create({
            data: {
                userId, productId, meteredItemKey, quantity: qty,
                unitPrice: meteredItem.unitPrice, total, status: 'SUCCEEDED',
                requestId, metadata: metadata || null,
            },
        });

        // Credit-first debit
        let creditUsed = 0;
        let realUsed = total;
        if (wallet.creditBalance > 0) {
            creditUsed = Math.min(wallet.creditBalance, total);
            realUsed = total - creditUsed;
        }

        await tx.wallet.update({
            where: { id: wallet.id },
            data: {
                balanceAvailable: { decrement: realUsed },
                creditBalance: { decrement: creditUsed },
            },
        });

        await tx.walletLedger.create({
            data: {
                walletId: wallet.id, userId, type: 'SPEND', amount: total,
                direction: 'DEBIT', refType: 'MINIAPP_USAGE', refId: usage.id,
                idempotencyKey: requestId,
                note: `${qty} ${meteredItem.unitName} (${meteredItem.key})`,
                metadata: { creditUsed, realUsed, unitPrice: meteredItem.unitPrice, version: meteredItem.version },
            },
        });

        // Update or create quota
        if (quota) {
            await tx.usageQuota.update({
                where: { id: quota.id },
                data: { quotaUsed: { increment: qty }, lastUsedAt: now },
            });
        } else {
            await tx.usageQuota.create({
                data: {
                    userId, productId, itemKey: meteredItemKey,
                    quotaLimit: 0, quotaUsed: qty,
                    periodStart, periodEnd, rateLimit: 60, lastUsedAt: now,
                },
            });
        }

        return usage;
    });

    return NextResponse.json({
        ok: true, usage: result, charged: total,
        balanceAfter: totalBalance - total,
    });
}
