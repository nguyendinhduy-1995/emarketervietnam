"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisioningQueue = void 0;
exports.enqueueProvisioningJob = enqueueProvisioningJob;
exports.createProvisioningWorker = createProvisioningWorker;
const bullmq_1 = require("bullmq");
const connection_1 = require("./connection");
const platform_1 = require("../db/platform");
const spa_1 = require("../db/spa");
const QUEUE_NAME = 'provisioning';
exports.provisioningQueue = new bullmq_1.Queue(QUEUE_NAME, {
    connection: (0, connection_1.getRedisConnection)(),
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 200,
    },
});
async function enqueueProvisioningJob(workspaceId) {
    // Create job record in DB
    const job = await platform_1.platformDb.provisioningJob.create({
        data: {
            workspaceId,
            type: 'SEED_SPA',
            status: 'PENDING',
        },
    });
    // Enqueue BullMQ job
    await exports.provisioningQueue.add('seed-spa', {
        workspaceId,
        jobId: job.id,
    });
    return job;
}
/**
 * Create the provisioning worker.
 * Call this from the worker process entry point.
 */
function createProvisioningWorker() {
    return new bullmq_1.Worker(QUEUE_NAME, async (job) => {
        const { workspaceId, jobId } = job.data;
        console.log(`[PROVISIONING] Processing workspace: ${workspaceId}`);
        // Update job status
        await platform_1.platformDb.provisioningJob.update({
            where: { id: jobId },
            data: { status: 'RUNNING', attempts: { increment: 1 } },
        });
        try {
            // 1. Get workspace info
            const workspace = await platform_1.platformDb.workspace.findUnique({
                where: { id: workspaceId },
            });
            if (!workspace)
                throw new Error('Workspace not found');
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
                await spa_1.spaDb.service.create({
                    data: Object.assign({ workspaceId }, svc),
                });
            }
            // 3. Update ProductInstance to ACTIVE
            await platform_1.platformDb.productInstance.updateMany({
                where: { workspaceId, productKey: 'SPA_CRM' },
                data: { status: 'ACTIVE' },
            });
            // 4. Update job to DONE
            await platform_1.platformDb.provisioningJob.update({
                where: { id: jobId },
                data: { status: 'DONE' },
            });
            // 5. Audit log
            await platform_1.platformDb.auditLog.create({
                data: {
                    workspaceId,
                    actorUserId: workspace.orgId, // system
                    action: 'PROVISIONING_COMPLETE',
                    payloadJson: { jobId },
                },
            });
            console.log(`[PROVISIONING] ✅ Workspace ${workspaceId} provisioned successfully`);
        }
        catch (error) {
            const errMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error(`[PROVISIONING] ❌ Failed for workspace ${workspaceId}:`, errMsg);
            // Update failure
            await platform_1.platformDb.provisioningJob.update({
                where: { id: jobId },
                data: { status: 'FAILED', lastError: errMsg },
            });
            await platform_1.platformDb.productInstance.updateMany({
                where: { workspaceId, productKey: 'SPA_CRM' },
                data: { status: 'FAILED', lastError: errMsg },
            });
            throw error; // re-throw for retry
        }
    }, {
        connection: (0, connection_1.getRedisConnection)(),
        concurrency: 5,
    });
}
