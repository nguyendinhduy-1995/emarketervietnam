import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getSessionFromRequest, hasPermission } from '@/lib/smk/auth';

// R1: Valid order status transitions (FSM)
const VALID_TRANSITIONS: Record<string, string[]> = {
    CREATED: ['PAID', 'PROCESSING', 'CANCELLED'],
    PAID: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPING', 'CANCELLED'],
    SHIPPING: ['DELIVERED', 'RETURNED'],
    DELIVERED: ['RETURNED'],
    RETURNED: [],
    CANCELLED: [],
};

// GET /api/smk/admin/orders — all orders (admin view)
export async function GET(req: NextRequest) {
    // S4: Verify admin session + permission
    const session = getSessionFromRequest(req);
    if (!session || !hasPermission(session, 'orders')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(50, Number(sp.get('limit')) || 20);
    const status = sp.get('status') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (sp.get('q')) {
        where.OR = [
            { code: { contains: sp.get('q')!, mode: 'insensitive' } },
            { user: { name: { contains: sp.get('q')!, mode: 'insensitive' } } },
        ];
    }

    const [orders, total] = await Promise.all([
        db.order.findMany({
            where,
            include: {
                user: { select: { name: true, phone: true, email: true } },
                items: { select: { nameSnapshot: true, qty: true, price: true } },
                referral: { select: { partner: { select: { partnerCode: true } } } },
                statusHistory: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.order.count({ where }),
    ]);

    return NextResponse.json({ orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// PATCH /api/smk/admin/orders — update order status
export async function PATCH(req: NextRequest) {
    // S4: Verify admin session + permission
    const session = getSessionFromRequest(req);
    if (!session || !hasPermission(session, 'orders')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, status, note, trackingNumber } = await req.json();

    if (!orderId || !status) {
        return NextResponse.json({ error: 'orderId and status required' }, { status: 400 });
    }

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // R1: Validate status transition
    const allowed = VALID_TRANSITIONS[order.status] || [];
    if (!allowed.includes(status)) {
        return NextResponse.json({ error: `Không thể chuyển từ ${order.status} sang ${status}` }, { status: 400 });
    }

    // Update order
    const updates: Record<string, unknown> = { status };
    if (trackingNumber) {
        updates.trackingNumber = trackingNumber;
    }

    await db.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: updates });

        // Add status history
        await tx.orderStatusHistory.create({
            data: { orderId, status, note },
        });

        // Handle commission based on status
        if (status === 'DELIVERED') {
            // Create pending commissions
            const referral = await tx.orderReferral.findUnique({ where: { orderId } });
            if (referral) {
                // Find commission rule
                const rule = await tx.commissionRule.findFirst({
                    where: {
                        OR: [
                            { scope: 'GLOBAL' },
                            // Could also check category/product specific rules
                        ],
                    },
                    orderBy: { scope: 'asc' }, // More specific rules first
                });

                if (rule) {
                    const commissionBase = order.subtotal - order.discountTotal;
                    const amount = rule.fixed || Math.round((commissionBase * (rule.percent || 0)) / 100);

                    const holdDays = 14; // Return window
                    const holdUntil = new Date();
                    holdUntil.setDate(holdUntil.getDate() + holdDays);

                    await tx.commission.create({
                        data: {
                            orderId,
                            partnerId: referral.partnerId,
                            amount,
                            status: 'PENDING',
                            holdUntil,
                        },
                    });

                    await tx.eventLog.create({
                        data: {
                            type: 'COMMISSION_PENDING',
                            partnerId: referral.partnerId,
                            orderId,
                            payload: { amount, holdUntil },
                        },
                    });
                }
            }

            // Release stock reservation
            const items = await tx.orderItem.findMany({ where: { orderId } });
            for (const item of items) {
                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: {
                        stockQty: { decrement: item.qty },
                        reservedQty: { decrement: item.qty },
                    },
                });
            }
        }

        if (status === 'RETURNED' || status === 'CANCELLED') {
            // Reverse commissions
            const commissions = await tx.commission.findMany({
                where: { orderId, status: { in: ['PENDING', 'AVAILABLE'] } },
            });

            for (const comm of commissions) {
                await tx.commission.update({ where: { id: comm.id }, data: { status: 'REVERSED' } });

                // Add reverse wallet tx if commission was already available
                if (comm.status === 'AVAILABLE') {
                    // R2: Calculate actual balanceAfter
                    const walletAgg = await tx.partnerWalletTx.aggregate({
                        where: { partnerId: comm.partnerId },
                        _sum: { amount: true },
                    });
                    const currentBalance = walletAgg._sum.amount || 0;
                    await tx.partnerWalletTx.create({
                        data: {
                            partnerId: comm.partnerId,
                            type: 'REVERSE',
                            amount: -comm.amount,
                            refId: comm.id,
                            balanceAfter: currentBalance - comm.amount,
                        },
                    });
                }

                await tx.eventLog.create({
                    data: {
                        type: 'COMMISSION_REVERSED',
                        partnerId: comm.partnerId,
                        orderId,
                        payload: { amount: comm.amount, reason: status },
                    },
                });
            }

            // Release reserved stock if cancelled before delivery
            if (status === 'CANCELLED') {
                const items = await tx.orderItem.findMany({ where: { orderId } });
                for (const item of items) {
                    await tx.productVariant.update({
                        where: { id: item.variantId },
                        data: { reservedQty: { decrement: item.qty } },
                    });
                }
            }
        }

        // Log status change
        await tx.eventLog.create({
            data: {
                type: status === 'SHIPPED' ? 'ORDER_SHIPPED' : status === 'DELIVERED' ? 'ORDER_DELIVERED' : status === 'RETURNED' ? 'ORDER_RETURNED' : 'ORDER_STATUS_CHANGE',
                orderId,
                userId: order.userId,
                payload: { from: order.status, to: status, note },
            },
        });
    });

    return NextResponse.json({ ok: true });
}
