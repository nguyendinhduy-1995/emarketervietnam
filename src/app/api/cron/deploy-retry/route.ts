import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/cron/deploy-retry
 * 
 * Cron job to retry stuck CRM deployments.
 * Finds CrmInstance with status DEPLOYING that are older than 15 minutes
 * and re-sends deploy request to VPS deployer.
 * 
 * Auth: CRON_SECRET header
 * Schedule: every 30 minutes — 0,30 * * * *
 */
export async function GET(req: Request) {
    const cronSecret = process.env.CRON_SECRET || 'cron-secret';
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    // Find stuck DEPLOYING instances (older than 15 minutes without completion)
    const stuckInstances = await db.crmInstance.findMany({
        where: {
            status: 'DEPLOYING',
            updatedAt: { lt: fifteenMinAgo },
        },
        include: {
            workspace: true,
        },
    });

    if (stuckInstances.length === 0) {
        return NextResponse.json({ ok: true, retried: 0, message: 'No stuck deployments' });
    }

    const deployerUrl = process.env.DEPLOYER_URL || 'http://127.0.0.1:9876/deploy';
    const deploySecret = process.env.DEPLOY_CALLBACK_SECRET || 'deploy-secret-key';
    const results: Array<{ instanceId: string; domain: string; status: string }> = [];

    for (const instance of stuckInstances) {
        // Count retry attempts
        const deployLog = (instance.deployLog as Record<string, unknown>) || {};
        const retryCount = (deployLog.retryCount as number) || 0;

        // Max 3 retries
        if (retryCount >= 3) {
            await db.crmInstance.update({
                where: { id: instance.id },
                data: {
                    status: 'PENDING', // Reset to PENDING for manual intervention
                    deployLog: {
                        ...deployLog,
                        maxRetriesReached: true,
                        lastRetryAt: new Date().toISOString(),
                    },
                },
            });

            await db.notificationQueue.create({
                data: {
                    userId: instance.adminUserId || '',
                    workspaceId: instance.workspaceId,
                    type: 'SYSTEM_ALERT',
                    channel: 'IN_APP',
                    title: '❌ Triển khai CRM cần hỗ trợ',
                    body: `Triển khai CRM tại ${instance.domain} thất bại sau 3 lần thử. Vui lòng liên hệ hỗ trợ.`,
                    referenceType: 'ORDER',
                    referenceId: instance.id,
                },
            });

            results.push({ instanceId: instance.id, domain: instance.domain, status: 'MAX_RETRIES' });
            continue;
        }

        // Retry deploy
        await db.crmInstance.update({
            where: { id: instance.id },
            data: {
                deployLog: {
                    ...deployLog,
                    retryCount: retryCount + 1,
                    lastRetryAt: new Date().toISOString(),
                },
            },
        });

        try {
            await fetch(deployerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${deploySecret}`,
                },
                body: JSON.stringify({
                    domain: instance.domain,
                    instanceId: instance.id,
                    dbName: instance.dbName || `crm_${instance.workspaceId.replace(/-/g, '_').slice(0, 20)}`,
                    workspaceId: instance.workspaceId,
                    adminEmail: `admin@${instance.domain}`,
                }),
            });
            results.push({ instanceId: instance.id, domain: instance.domain, status: 'RETRIED' });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            results.push({ instanceId: instance.id, domain: instance.domain, status: `RETRY_FAILED: ${message}` });
        }
    }

    // Log
    await db.eventLog.create({
        data: {
            type: 'CRON_DEPLOY_RETRY',
            payloadJson: { total: stuckInstances.length, results },
        },
    });

    return NextResponse.json({
        ok: true,
        retried: results.length,
        results,
    });
}
