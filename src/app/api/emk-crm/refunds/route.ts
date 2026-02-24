import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import crypto from 'crypto';

// POST — process refund (admin only)
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { orderId, amount, type, reason } = await req.json();
    if (!orderId || !reason) {
        return NextResponse.json({ error: 'orderId và reason là bắt buộc' }, { status: 400 });
    }

    const order = await db.commerceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.status === 'FAILED') {
        return NextResponse.json({ error: 'Đơn hàng không tồn tại' }, { status: 404 });
    }

    const refundAmount = amount || order.totalAmount - order.refundedAmount;
    if (refundAmount <= 0) return NextResponse.json({ error: 'Không còn gì để hoàn' }, { status: 400 });
    if (order.refundedAmount + refundAmount > order.totalAmount) {
        return NextResponse.json({ error: 'Số tiền hoàn vượt quá tổng đơn' }, { status: 400 });
    }

    const idempKey = `refund_${orderId}_${Date.now()}`;
    const refundType = type || (refundAmount >= order.totalAmount - order.refundedAmount ? 'FULL' : 'PARTIAL');

    const result = await db.$transaction(async (tx) => {
        // Create refund record
        const refund = await tx.refundRecord.create({
            data: {
                orderId, userId: order.userId, amount: refundAmount,
                type: refundType, reason, status: 'PROCESSED',
                processedBy: String(auth.user.id), processedAt: new Date(), idempotencyKey: idempKey,
            },
        });

        // Credit wallet
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balanceAvailable: { increment: refundAmount } },
            });
            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId: order.userId, type: 'REFUND',
                    amount: refundAmount, direction: 'CREDIT',
                    refType: 'PURCHASE', refId: refund.id,
                    idempotencyKey: idempKey, note: `Hoàn tiền: ${reason}`,
                },
            });
        }

        // Update order
        const newRefundedAmount = order.refundedAmount + refundAmount;
        const newStatus = newRefundedAmount >= order.totalAmount ? 'REFUNDED' : 'PARTIAL_REFUND';
        await tx.commerceOrder.update({
            where: { id: orderId },
            data: { refundedAmount: newRefundedAmount, status: newStatus },
        });

        // Revoke entitlements if full refund
        if (newStatus === 'REFUNDED') {
            await tx.entitlement.updateMany({
                where: { meta: { path: ['orderId'], equals: orderId } },
                data: { status: 'REVOKED', revokedAt: new Date(), revokeReason: `Hoàn tiền: ${reason}` },
            });
        }

        // Create receipt
        const receiptNo = `EMK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-R${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        await tx.receipt.create({
            data: {
                userId: order.userId, orderId, type: 'REFUND', amount: refundAmount,
                description: `Hoàn tiền đơn #${orderId.slice(-6)}: ${reason}`, receiptNo,
            },
        });

        // Queue notification
        await tx.notificationQueue.create({
            data: {
                userId: order.userId, type: 'REFUND_PROCESSED', title: 'Hoàn tiền thành công',
                body: `Bạn đã được hoàn ${refundAmount.toLocaleString()}đ. Lý do: ${reason}`,
                referenceType: 'ORDER', referenceId: orderId,
            },
        });

        return refund;
    });

    return NextResponse.json({ ok: true, refund: result });
}

// GET — list refunds
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const refunds = await db.refundRecord.findMany({
        include: { order: { select: { totalAmount: true, userId: true } } },
        orderBy: { createdAt: 'desc' }, take: 100,
    });
    return NextResponse.json(refunds);
}
