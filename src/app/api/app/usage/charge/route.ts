import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// PAYG Usage Charge API (idempotent via requestId)
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

    // Idempotency check
    const existing = await db.usageEvent.findUnique({ where: { requestId } });
    if (existing) {
        if (existing.status === 'SUCCEEDED') return NextResponse.json({ ok: true, usage: existing, message: 'Đã xử lý' });
        if (existing.status === 'PENDING') return NextResponse.json({ error: 'Đang xử lý' }, { status: 409 });
    }

    // Get metered item
    const meteredItem = await db.meteredItem.findFirst({ where: { productId, key: meteredItemKey, isActive: true } });
    if (!meteredItem) return NextResponse.json({ error: `Không tìm thấy đơn vị "${meteredItemKey}"` }, { status: 404 });

    const qty = quantity || 1;
    const total = meteredItem.unitPrice * qty;

    // Check wallet
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (!wallet) return NextResponse.json({ error: 'Chưa có ví' }, { status: 400 });
    if (wallet.balanceAvailable < total) {
        return NextResponse.json({
            error: `Số dư không đủ. Cần ${total.toLocaleString()}đ`,
            code: 'INSUFFICIENT_BALANCE', required: total, balance: wallet.balanceAvailable,
        }, { status: 400 });
    }

    // Atomic: usage + debit
    const result = await db.$transaction(async (tx) => {
        const usage = await tx.usageEvent.create({
            data: {
                userId, productId, meteredItemKey, quantity: qty,
                unitPrice: meteredItem.unitPrice, total, status: 'SUCCEEDED',
                requestId, metadata: metadata || null,
            },
        });

        await tx.wallet.update({
            where: { id: wallet.id },
            data: { balanceAvailable: { decrement: total } },
        });

        await tx.walletLedger.create({
            data: {
                walletId: wallet.id, userId, type: 'SPEND', amount: total,
                direction: 'DEBIT', refType: 'MINIAPP_USAGE', refId: usage.id,
                idempotencyKey: requestId, note: `${qty} ${meteredItem.unitName} (${meteredItem.key})`,
            },
        });

        return usage;
    });

    return NextResponse.json({
        ok: true, usage: result, charged: total, balanceAfter: wallet.balanceAvailable - total,
    });
}
