import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './connection';
import { platformDb } from '../db/platform';
import { sendEmail, renderRenewalReminder } from '../email';

const QUEUE_NAME = 'dunning';

export const dunningQueue = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 50,
        removeOnFail: 100,
    },
});

/**
 * Schedule daily dunning scan.
 * Should be called once on worker startup.
 */
export async function scheduleDunningScan() {
    // Remove existing repeatable job
    const repeatableJobs = await dunningQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await dunningQueue.removeRepeatableByKey(job.key);
    }

    // Add daily scan at 8:00 AM
    await dunningQueue.add(
        'daily-scan',
        {},
        {
            repeat: { pattern: '0 8 * * *' }, // 8 AM daily
        }
    );

    console.log('[DUNNING] Scheduled daily scan at 8:00 AM');
}

// Default reminder offsets (days relative to expiry)
const DEFAULT_OFFSETS = [-7, -3, -1, 1, 3];

export function createDunningWorker() {
    return new Worker(
        QUEUE_NAME,
        async () => {
            console.log('[DUNNING] Running daily subscription scan...');

            const now = new Date();
            const scanWindow = new Date();
            scanWindow.setDate(scanWindow.getDate() + 8); // Look 8 days ahead

            // Find subscriptions that expire within window or are overdue
            const subscriptions = await platformDb.subscription.findMany({
                where: {
                    status: { in: ['ACTIVE', 'PAST_DUE'] },
                    currentPeriodEnd: {
                        lte: scanWindow,
                        not: null,
                    },
                },
                include: {
                    workspace: {
                        include: {
                            memberships: {
                                where: { role: 'OWNER' },
                                include: { user: true },
                            },
                        },
                    },
                },
            });

            for (const sub of subscriptions) {
                if (!sub.currentPeriodEnd) continue;

                const daysUntilExpiry = Math.ceil(
                    (sub.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                );

                // Check each offset
                for (const offset of DEFAULT_OFFSETS) {
                    if (daysUntilExpiry !== -offset) continue; // offset is negative for pre-expiry

                    // Check if reminder already sent
                    const existing = await platformDb.reminderLog.findFirst({
                        where: {
                            subscriptionId: sub.id,
                            offsetDay: offset,
                            status: 'SENT',
                        },
                    });
                    if (existing) continue;

                    // Handle state transitions
                    if (offset === 1) {
                        // T+1: transition to PAST_DUE
                        await platformDb.subscription.update({
                            where: { id: sub.id },
                            data: { status: 'PAST_DUE' },
                        });
                        // Deactivate paid entitlements
                        await platformDb.entitlement.updateMany({
                            where: { workspaceId: sub.workspaceId, status: 'ACTIVE' },
                            data: { status: 'INACTIVE' },
                        });
                        console.log(`[DUNNING] Workspace ${sub.workspaceId} → PAST_DUE`);
                    }

                    if (offset === 3) {
                        // T+3: transition to SUSPENDED
                        await platformDb.subscription.update({
                            where: { id: sub.id },
                            data: { status: 'SUSPENDED' },
                        });
                        await platformDb.workspace.update({
                            where: { id: sub.workspaceId },
                            data: { status: 'SUSPENDED' },
                        });
                        console.log(`[DUNNING] Workspace ${sub.workspaceId} → SUSPENDED`);
                    }

                    // Send email to owner
                    const owner = sub.workspace.memberships[0]?.user;
                    if (owner?.email) {
                        const emailData = renderRenewalReminder({
                            workspaceName: sub.workspace.name,
                            daysUntilExpiry: -offset,
                            planName: sub.planKey,
                            renewUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/billing`,
                        });
                        emailData.to = owner.email;
                        await sendEmail(emailData);
                    }

                    // Log the reminder
                    await platformDb.reminderLog.create({
                        data: {
                            workspaceId: sub.workspaceId,
                            subscriptionId: sub.id,
                            offsetDay: offset,
                            channel: 'EMAIL',
                            status: 'SENT',
                            sentAt: now,
                        },
                    });

                    console.log(`[DUNNING] Sent T${offset > 0 ? '+' : ''}${offset} reminder for workspace ${sub.workspaceId}`);
                }
            }

            console.log(`[DUNNING] Scan complete. Processed ${subscriptions.length} subscriptions.`);
        },
        {
            connection: getRedisConnection(),
            concurrency: 1,
        }
    );
}
