import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/billing/webhook
 * 
 * Handles subscription lifecycle events:
 * - subscription.renewed    → extend period, keep ACTIVE
 * - subscription.expired    → set PAST_DUE, notify user
 * - subscription.cancelled  → set CANCELLED, revoke non-core entitlements
 * - subscription.payment_failed → set PAST_DUE, warn user
 * 
 * Auth: Bearer BILLING_WEBHOOK_SECRET
 */
export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    const secret = process.env.BILLING_WEBHOOK_SECRET || process.env.CRON_SECRET;
    if (secret && auth !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, subscriptionId, workspaceId, data: eventData } = await req.json();
    if (!event || !subscriptionId) {
        return NextResponse.json({ error: 'event and subscriptionId required' }, { status: 400 });
    }

    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });

    const ws = sub.workspaceId;

    switch (event) {
        case 'subscription.renewed': {
            // Extend subscription period
            const newEnd = new Date();
            newEnd.setMonth(newEnd.getMonth() + (sub.planKey === 'YEARLY' ? 12 : 1));

            await db.$transaction([
                db.subscription.update({
                    where: { id: subscriptionId },
                    data: { status: 'ACTIVE', currentPeriodEnd: newEnd },
                }),
                db.entitlement.updateMany({
                    where: { workspaceId: ws, status: { in: ['ACTIVE', 'TRIAL'] } },
                    data: { activeTo: newEnd },
                }),
                db.eventLog.create({
                    data: { workspaceId: ws, type: 'SUBSCRIPTION_RENEWED', payloadJson: { subscriptionId, newEnd: newEnd.toISOString() } },
                }),
            ]);
            break;
        }

        case 'subscription.expired': {
            await db.$transaction([
                db.subscription.update({
                    where: { id: subscriptionId },
                    data: { status: 'PAST_DUE' },
                }),
                db.eventLog.create({
                    data: { workspaceId: ws, type: 'SUBSCRIPTION_EXPIRED', payloadJson: { subscriptionId } },
                }),
                db.notificationQueue.create({
                    data: {
                        userId: sub.userId || '', workspaceId: ws,
                        type: 'SYSTEM_ALERT',
                        title: '⚠️ Gói đã hết hạn',
                        body: 'Vui lòng gia hạn để tiếp tục sử dụng đầy đủ tính năng.',
                        referenceType: 'SUBSCRIPTION', referenceId: subscriptionId,
                    },
                }),
            ]);
            break;
        }

        case 'subscription.cancelled': {
            await db.$transaction([
                db.subscription.update({
                    where: { id: subscriptionId },
                    data: { status: 'CANCELLED', canceledAt: new Date() },
                }),
                db.entitlement.updateMany({
                    where: { workspaceId: ws, status: { in: ['ACTIVE', 'TRIAL'] }, moduleKey: { not: { startsWith: 'CORE_' } } },
                    data: { status: 'REVOKED', revokeReason: 'Subscription cancelled' },
                }),
                db.eventLog.create({
                    data: { workspaceId: ws, type: 'SUBSCRIPTION_CANCELLED', payloadJson: { subscriptionId } },
                }),
                db.notificationQueue.create({
                    data: {
                        userId: sub.userId || '', workspaceId: ws,
                        type: 'SYSTEM_ALERT',
                        title: '❌ Gói đã hủy',
                        body: 'Các add-on đã bị vô hiệu hóa. Chỉ còn tính năng cơ bản.',
                        referenceType: 'SUBSCRIPTION', referenceId: subscriptionId,
                    },
                }),
            ]);
            break;
        }

        case 'subscription.payment_failed': {
            await db.$transaction([
                db.subscription.update({
                    where: { id: subscriptionId },
                    data: { status: 'PAST_DUE' },
                }),
                db.eventLog.create({
                    data: { workspaceId: ws, type: 'PAYMENT_FAILED', payloadJson: { subscriptionId, ...eventData } },
                }),
                db.notificationQueue.create({
                    data: {
                        userId: sub.userId || '', workspaceId: ws,
                        type: 'SYSTEM_ALERT',
                        title: '⚠️ Thanh toán thất bại',
                        body: 'Thanh toán gia hạn gặp lỗi. Vui lòng cập nhật phương thức thanh toán.',
                        referenceType: 'SUBSCRIPTION', referenceId: subscriptionId,
                    },
                }),
            ]);
            break;
        }

        default:
            return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, event, subscriptionId });
}
