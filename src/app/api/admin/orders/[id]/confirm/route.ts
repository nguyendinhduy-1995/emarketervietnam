import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const order = await platformDb.upgradeOrder.findUnique({
        where: { id },
    });
    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status !== 'PENDING' && order.status !== 'NEED_REVIEW') {
        return NextResponse.json({ error: `Cannot confirm order with status ${order.status}` }, { status: 400 });
    }

    // Manual confirm
    await platformDb.$transaction(async (tx) => {
        await tx.upgradeOrder.update({
            where: { id: order.id },
            data: { status: 'PAID' },
        });

        // Grant entitlements
        const items = order.itemsJson as Array<{
            moduleKey: string;
            months: number;
        }>;

        for (const item of items) {
            const now = new Date();
            const activeTo = new Date();
            activeTo.setMonth(activeTo.getMonth() + item.months);

            await tx.entitlement.upsert({
                where: {
                    id: 'manual-' + order.id + '-' + item.moduleKey, // won't match, forces create path
                },
                create: {
                    workspaceId: order.workspaceId,
                    moduleKey: item.moduleKey,
                    status: 'ACTIVE',
                    activeFrom: now,
                    activeTo,
                },
                update: {},
            });
        }

        await tx.auditLog.create({
            data: {
                workspaceId: order.workspaceId,
                actorUserId: authResult.user.userId,
                action: 'ADMIN_MANUAL_CONFIRM',
                payloadJson: { orderId: order.id, orderCode: order.orderCode },
            },
        });
    });

    return NextResponse.json({ success: true, message: `Order ${order.orderCode} confirmed` });
}
