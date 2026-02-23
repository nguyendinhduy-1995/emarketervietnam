import { Queue, Worker } from 'bullmq';
import { getRedisConnection } from './connection';
import { platformDb } from '../db/platform';
import { spaDb } from '../db/spa';

const QUEUE_NAME = 'appointment-reminders';

export const appointmentQueue = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 100,
        removeOnFail: 100,
    },
});

/**
 * Schedule hourly appointment reminder scan.
 */
export async function scheduleAppointmentScan() {
    // Remove existing repeatable job
    const repeatableJobs = await appointmentQueue.getRepeatableJobs();
    for (const job of repeatableJobs) {
        await appointmentQueue.removeRepeatableByKey(job.key);
    }

    // Add hourly scan pattern
    await appointmentQueue.add(
        'hourly-scan',
        {},
        {
            repeat: { pattern: '0 * * * *' }, // every hour
        }
    );

    console.log('[REMINDER] Scheduled hourly appointment scan');
}

export function createAppointmentWorker() {
    return new Worker(
        QUEUE_NAME,
        async (job) => {
            console.log(`[REMINDER] Running hourly appointment scan: Job ${job.id}`);

            // Find all active workspaces
            const workspaces = await platformDb.workspace.findMany({
                where: { status: 'ACTIVE' },
            });

            for (const ws of workspaces) {
                // Check if workspace has AUTOMATION entitlement active
                const hasAutomation = await platformDb.entitlement.findFirst({
                    where: {
                        workspaceId: ws.id,
                        moduleKey: 'automation',
                        status: 'ACTIVE',
                    },
                });

                if (!hasAutomation) continue;

                const now = new Date();
                const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

                // Find all appointments scheduled between now and tomorrow that haven't been reminded
                const appointments = await spaDb.appointment.findMany({
                    where: {
                        workspaceId: ws.id,
                        status: { in: ['SCHEDULED', 'CONFIRMED'] },
                        startAt: {
                            gte: now,
                            lte: tomorrow,
                        },
                        reminderSent: false,
                    },
                    include: { customer: true, service: true },
                });

                if (appointments.length === 0) continue;

                console.log(`[REMINDER] Workspace ${ws.slug}: Found ${appointments.length} appointments to remind.`);

                for (const appt of appointments) {
                    const customerPhone = appt.customer.phone;
                    const customerName = appt.customer.name;
                    const serviceName = appt.service.name;
                    const timeStr = appt.startAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

                    if (!customerPhone) {
                        // Mark as sent to prevent infinite retries if there's no phone number
                        await spaDb.appointment.update({
                            where: { id: appt.id },
                            data: { reminderSent: true, notes: (appt.notes || '') + '\n[System] Không gửi được nhắc hẹn vì thiếu SĐT.' },
                        });
                        continue;
                    }

                    // SIMULATE: Send Zalo ZNS / SMS
                    console.log(`[ZNS/SMS] 📲 Sending reminder to ${customerName} (${customerPhone})...`);
                    console.log(`   Message: "Kính chào ${customerName}, bạn có lịch hẹn dịch vụ ${serviceName} tại Spa ${ws.name} vào lúc ${timeStr}. Vui lòng đến đúng giờ nhé!"`);

                    // Mark as sent
                    await spaDb.appointment.update({
                        where: { id: appt.id },
                        data: { reminderSent: true },
                    });
                }
            }

            console.log(`[REMINDER] Hourly scan complete: Job ${job.id}`);
        },
        {
            connection: getRedisConnection(),
            concurrency: 1,
        }
    );
}
