import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/cron/subscription-check
 * 
 * Daily cron job to check subscription status:
 * - 7 days before expiry: send reminder notification
 * - Expired: set PAST_DUE with 72h grace period
 * - Grace expired: SUSPENDED, lock entitlements
 * 
 * Should be called by external cron (e.g. Vercel cron, GitHub Actions)
 * Auth: Bearer CRON_SECRET
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CRON_SECRET || 'cron-secret-key';
    if (authHeader !== `Bearer ${expectedSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400_000);
    const stats = { reminders: 0, pastDue: 0, suspended: 0 };

    // 1. Send reminders (7 days before currentPeriodEnd)
    const expiringSoon = await db.subscription.findMany({
        where: {
            status: 'ACTIVE',
            currentPeriodEnd: { lte: sevenDaysFromNow, gt: now },
        },
    });

    for (const sub of expiringSoon) {
        // Check if reminder already sent in last 24h
        const recentReminder = await db.reminderLog.findFirst({
            where: {
                subscriptionId: sub.id,
                sentAt: { gt: new Date(now.getTime() - 86400_000) },
            },
        });
        if (recentReminder) continue;

        const daysLeft = Math.ceil((sub.currentPeriodEnd!.getTime() - now.getTime()) / 86400_000);

        await db.notificationQueue.create({
            data: {
                userId: sub.userId || '',
                workspaceId: sub.workspaceId,
                type: 'SUBSCRIPTION_REMINDER',
                title: `⏰ Gói dịch vụ sắp hết hạn (${daysLeft} ngày)`,
                body: `Gói ${sub.planKey} sẽ hết hạn vào ${sub.currentPeriodEnd?.toLocaleDateString('vi-VN')}. Gia hạn để tránh gián đoạn dịch vụ.`,
                referenceType: 'SUBSCRIPTION',
                referenceId: sub.id,
            },
        });

        await db.reminderLog.create({
            data: {
                subscriptionId: sub.id,
                workspaceId: sub.workspaceId,
                offsetDay: daysLeft,
                channel: 'NOTIFICATION',
                status: 'SENT',
                sentAt: now,
            },
        });

        stats.reminders++;
    }

    // 2. Mark PAST_DUE subscriptions (expired, within grace period)
    const expired = await db.subscription.findMany({
        where: {
            status: 'ACTIVE',
            currentPeriodEnd: { lt: now },
        },
    });

    for (const sub of expired) {
        const graceEnd = new Date(sub.currentPeriodEnd!.getTime() + 72 * 3600_000); // 72h grace

        await db.subscription.update({
            where: { id: sub.id },
            data: {
                status: 'PAST_DUE',
                graceUntil: graceEnd,
            },
        });

        await db.notificationQueue.create({
            data: {
                userId: sub.userId || '',
                workspaceId: sub.workspaceId,
                type: 'SUBSCRIPTION_PAST_DUE',
                title: '⚠️ Gói dịch vụ đã hết hạn',
                body: `Gói ${sub.planKey} đã hết hạn. Bạn có 72 giờ để gia hạn trước khi dịch vụ bị tạm ngưng.`,
                referenceType: 'SUBSCRIPTION',
                referenceId: sub.id,
            },
        });

        stats.pastDue++;
    }

    // 3. Suspend past grace period
    const pastGrace = await db.subscription.findMany({
        where: {
            status: 'PAST_DUE',
            graceUntil: { lt: now },
        },
    });

    for (const sub of pastGrace) {
        await db.$transaction(async (tx) => {
            // Suspend subscription
            await tx.subscription.update({
                where: { id: sub.id },
                data: { status: 'SUSPENDED' },
            });

            // Suspend non-core entitlements
            await tx.entitlement.updateMany({
                where: {
                    workspaceId: sub.workspaceId,
                    status: 'ACTIVE',
                },
                data: { status: 'INACTIVE' },
            });

            // Suspend CRM instance
            await tx.crmInstance.updateMany({
                where: { workspaceId: sub.workspaceId, status: 'ACTIVE' },
                data: { status: 'SUSPENDED', suspendedAt: now },
            });

            // Notify
            await tx.notificationQueue.create({
                data: {
                    userId: sub.userId || '',
                    workspaceId: sub.workspaceId,
                    type: 'SUBSCRIPTION_SUSPENDED',
                    title: '🔒 Dịch vụ đã bị tạm ngưng',
                    body: `Gói ${sub.planKey} đã bị tạm ngưng do quá hạn thanh toán. Gia hạn để khôi phục dịch vụ.`,
                    referenceType: 'SUBSCRIPTION',
                    referenceId: sub.id,
                },
            });
        });

        stats.suspended++;
    }

    // Log
    await db.eventLog.create({
        data: {
            type: 'SUBSCRIPTION_CRON_RUN',
            payloadJson: { ...stats, runAt: now.toISOString() },
        },
    });

    return NextResponse.json({
        ok: true,
        stats,
        message: `Cron: ${stats.reminders} reminders, ${stats.pastDue} past due, ${stats.suspended} suspended`,
    });
}
