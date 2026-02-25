import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';
import { signUsageToken } from '@/lib/auth/usage-token';

/**
 * POST /api/hub/usage/charge
 * 
 * App charges user's wallet for PAYG usage → returns usageToken.
 * 
 * Body: { productId, itemKey, quantity, idempotencyKey }
 * Returns: { usageToken, eventId, charged }
 * 
 * Uses HOLD (not immediate debit) so we can refund on failure.
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { productId, itemKey, quantity = 1, idempotencyKey } = body;

    if (!productId || !itemKey || !idempotencyKey) {
        return NextResponse.json(
            { error: 'productId, itemKey, idempotencyKey required' },
            { status: 400 },
        );
    }

    // 1. Idempotency check
    const existingEvent = await db.usageEvent.findUnique({
        where: { requestId: idempotencyKey },
    });
    if (existingEvent) {
        if (existingEvent.status === 'PENDING' || existingEvent.status === 'SUCCEEDED') {
            // Already processed — return the existing token
            const token = await signUsageToken({
                eventId: existingEvent.id,
                userId: session.userId,
                productId,
                itemKey,
                quantity: existingEvent.quantity,
                total: existingEvent.total,
            });
            return NextResponse.json({
                usageToken: token,
                eventId: existingEvent.id,
                charged: existingEvent.total,
                idempotent: true,
            });
        }
        return NextResponse.json(
            { error: 'Request đã xử lý và thất bại', code: 'ALREADY_FAILED' },
            { status: 409 },
        );
    }

    // 2. Get metered item price
    const metered = await db.meteredItem.findFirst({
        where: {
            productId,
            key: itemKey,
            isActive: true,
            effectiveFrom: { lte: new Date() },
            OR: [
                { effectiveTo: null },
                { effectiveTo: { gt: new Date() } },
            ],
        },
        orderBy: { version: 'desc' },
    });

    if (!metered) {
        return NextResponse.json({ error: 'Không tìm thấy giá', code: 'ITEM_NOT_FOUND' }, { status: 404 });
    }

    const total = metered.unitPrice * quantity;

    // 3. Check quota
    const now = new Date();
    const quota = await db.usageQuota.findFirst({
        where: {
            userId: session.userId,
            productId,
            itemKey,
            periodEnd: { gt: now },
        },
    });
    if (quota && quota.quotaLimit > 0 && quota.quotaUsed + quantity > quota.quotaLimit) {
        return NextResponse.json({
            error: `Đã hết quota (${quota.quotaUsed}/${quota.quotaLimit})`,
            code: 'QUOTA_EXCEEDED',
            quotaUsed: quota.quotaUsed,
            quotaLimit: quota.quotaLimit,
        }, { status: 429 });
    }

    // 4. Wallet hold (atomic transaction)
    const result = await db.$transaction(async (tx) => {
        // Lock wallet row
        const wallet = await tx.wallet.findUnique({ where: { userId: session.userId } });
        if (!wallet || wallet.balanceAvailable < total) {
            throw new Error('INSUFFICIENT_BALANCE');
        }

        // Debit wallet (HOLD)
        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balanceAvailable: { decrement: total } },
        });

        // Create ledger entry (HOLD type)
        const ledger = await tx.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: session.userId,
                type: 'HOLD',
                amount: total,
                direction: 'DEBIT',
                refType: 'USAGE',
                refId: idempotencyKey,
                idempotencyKey: `payg_hold_${idempotencyKey}`,
                note: `PAYG: ${itemKey} x${quantity}`,
            },
        });

        // Create usage event
        const event = await tx.usageEvent.create({
            data: {
                userId: session.userId,
                productId,
                meteredItemKey: itemKey,
                quantity,
                unitPrice: metered.unitPrice,
                total,
                status: 'PENDING',
                requestId: idempotencyKey,
                metadata: { ledgerId: ledger.id },
            },
        });

        // Update quota if exists
        if (quota) {
            await tx.usageQuota.update({
                where: { id: quota.id },
                data: { quotaUsed: { increment: quantity }, lastUsedAt: now },
            });
        }

        return event;
    }).catch((err) => {
        if (err instanceof Error && err.message === 'INSUFFICIENT_BALANCE') {
            return null;
        }
        throw err;
    });

    if (!result) {
        return NextResponse.json({
            error: 'Số dư không đủ',
            code: 'INSUFFICIENT_BALANCE',
        }, { status: 402 });
    }

    // 5. Sign usage token
    const usageToken = await signUsageToken({
        eventId: result.id,
        userId: session.userId,
        productId,
        itemKey,
        quantity,
        total,
    });

    return NextResponse.json({
        usageToken,
        eventId: result.id,
        charged: total,
    });
}
