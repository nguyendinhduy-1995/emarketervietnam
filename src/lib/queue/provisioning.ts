import { Queue, Worker, type Job } from 'bullmq';
import { getRedisConnection } from './connection';
import { platformDb } from '../db/platform';
import { spaDb } from '../db/spa';

const QUEUE_NAME = 'provisioning';

export const provisioningQueue = new Queue(QUEUE_NAME, {
    connection: getRedisConnection(),
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});

export async function enqueueProvisioningJob(workspaceId: string) {
    // Create job record in DB
    const job = await platformDb.provisioningJob.create({
        data: {
            workspaceId,
            type: 'SEED_SPA',
            status: 'PENDING',
        },
    });

    // Enqueue BullMQ job
    await provisioningQueue.add('seed-spa', {
        workspaceId,
        jobId: job.id,
    });

    return job;
}

/**
 * Create the provisioning worker.
 * Call this from the worker process entry point.
 */
export function createProvisioningWorker() {
    return new Worker(
        QUEUE_NAME,
        async (job: Job) => {
            const { workspaceId, jobId } = job.data;
            console.log(`[PROVISIONING] Processing workspace: ${workspaceId}`);

            // Update job status
            await platformDb.provisioningJob.update({
                where: { id: jobId },
                data: { status: 'RUNNING', attempts: { increment: 1 } },
            });

            try {
                // 1. Get workspace info
                const workspace = await platformDb.workspace.findUnique({
                    where: { id: workspaceId },
                });
                if (!workspace) throw new Error('Workspace not found');

                // 2. Seed sample services
                const sampleServices = [
                    { name: 'Gội đầu', durationMin: 30, price: 50000, category: 'Chăm sóc tóc' },
                    { name: 'Cắt tóc', durationMin: 45, price: 100000, category: 'Chăm sóc tóc' },
                    { name: 'Nhuộm tóc', durationMin: 120, price: 500000, category: 'Chăm sóc tóc' },
                    { name: 'Massage mặt', durationMin: 60, price: 200000, category: 'Chăm sóc da' },
                    { name: 'Chăm sóc da cơ bản', durationMin: 90, price: 350000, category: 'Chăm sóc da' },
                    { name: 'Wax lông', durationMin: 30, price: 150000, category: 'Triệt lông' },
                    { name: 'Nail cơ bản', durationMin: 60, price: 120000, category: 'Nail' },
                ];

                for (const svc of sampleServices) {
                    await spaDb.service.create({
                        data: { workspaceId, ...svc },
                    });
                }

                // 3. Update ProductInstance to ACTIVE
                await platformDb.productInstance.updateMany({
                    where: { workspaceId, productKey: 'SPA_CRM' },
                    data: { status: 'ACTIVE' },
                });

                // 4. Update job to DONE
                await platformDb.provisioningJob.update({
                    where: { id: jobId },
                    data: { status: 'DONE' },
                });

                // 5. Audit log
                await platformDb.eventLog.create({
                    data: {
                        workspaceId,
                        actorUserId: workspace.orgId, // system
                        type: 'PROVISIONING_COMPLETE',
                        payloadJson: { jobId },
                    },
                });

                console.log(`[PROVISIONING] ✅ Workspace ${workspaceId} provisioned successfully`);
            } catch (error) {
                const errMsg = error instanceof Error ? error.message : 'Unknown error';
                console.error(`[PROVISIONING] ❌ Failed for workspace ${workspaceId}:`, errMsg);

                // Update failure
                await platformDb.provisioningJob.update({
                    where: { id: jobId },
                    data: { status: 'FAILED', lastError: errMsg },
                });
                await platformDb.productInstance.updateMany({
                    where: { workspaceId, productKey: 'SPA_CRM' },
                    data: { status: 'FAILED', lastError: errMsg },
                });

                throw error; // re-throw for retry
            }
        },
        {
            connection: getRedisConnection(),
            concurrency: 5,
        }
    );
}
