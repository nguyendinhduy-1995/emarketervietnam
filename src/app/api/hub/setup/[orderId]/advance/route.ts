import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';
import { canTransition, OrderStatus } from '@/lib/order-status';

// POST /api/hub/setup/[orderId]/advance — Advance order to next status in CRM pipeline
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { orderId } = await params;

    const order = await db.commerceOrder.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== session.userId) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // Determine next status
    let nextStatus: string | null = null;

    switch (order.status) {
        case OrderStatus.PAID_WAITING_DOMAIN_VERIFY: {
            // Verify DNS is verified for this workspace
            const workspaceId = order.workspaceId;
            if (!workspaceId) {
                return NextResponse.json({ error: 'Order thiếu workspaceId' }, { status: 400 });
            }
            const dnsOk = await db.dnsVerification.findFirst({
                where: { workspaceId, status: 'VERIFIED' },
            });
            if (!dnsOk) {
                return NextResponse.json({ error: 'Domain chưa được xác minh' }, { status: 400 });
            }
            nextStatus = OrderStatus.DOMAIN_VERIFIED;
            break;
        }

        case OrderStatus.DOMAIN_VERIFIED:
            nextStatus = OrderStatus.DEPLOYING;
            break;

        case OrderStatus.DEPLOYING:
            nextStatus = OrderStatus.DELIVERED_ACTIVE;
            break;

        default:
            return NextResponse.json({ error: `Không thể advance từ status: ${order.status}` }, { status: 400 });
    }

    if (!canTransition(order.status, nextStatus)) {
        return NextResponse.json({ error: `Transition không hợp lệ: ${order.status} → ${nextStatus}` }, { status: 400 });
    }

    await db.commerceOrder.update({
        where: { id: orderId },
        data: { status: nextStatus },
    });

    // If advancing to DELIVERED_ACTIVE, activate entitlement
    if (nextStatus === OrderStatus.DELIVERED_ACTIVE && order.workspaceId) {
        await db.entitlement.updateMany({
            where: {
                workspaceId: order.workspaceId,
                status: 'PENDING',
                meta: { path: ['orderId'], equals: orderId },
            },
            data: { status: 'ACTIVE' },
        });

        // Update CRM instance status
        await db.crmInstance.updateMany({
            where: { workspaceId: order.workspaceId, status: 'DEPLOYING' },
            data: { status: 'ACTIVE', deployedAt: new Date() },
        });
    }

    // Log
    await db.eventLog.create({
        data: {
            actorUserId: session.userId,
            workspaceId: order.workspaceId,
            type: 'ORDER_STATUS_ADVANCED',
            payloadJson: { orderId, from: order.status, to: nextStatus },
        },
    });

    return NextResponse.json({
        ok: true,
        orderId,
        previousStatus: order.status,
        currentStatus: nextStatus,
    });
}
