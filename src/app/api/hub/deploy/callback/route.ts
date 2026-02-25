import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/deploy/callback
 * 
 * External deployer script calls this after deploying CRM container.
 * Authenticated via DEPLOY_CALLBACK_SECRET header.
 * 
 * Body: { instanceId, crmUrl, status: 'SUCCESS' | 'FAILED', error?, containerId? }
 * 
 * On SUCCESS: update CrmInstance → ACTIVE, save crmUrl, notify user.
 * On FAILED:  update CrmInstance → PENDING, log error.
 */
export async function POST(req: NextRequest) {
    // Verify callback secret (deployer auth)
    const secret = req.headers.get('x-deploy-secret');
    if (secret !== process.env.DEPLOY_CALLBACK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { instanceId, crmUrl, status, error: deployError, containerId } = body;

    if (!instanceId || !status) {
        return NextResponse.json({ error: 'instanceId, status required' }, { status: 400 });
    }

    // Find instance
    const instance = await db.crmInstance.findUnique({
        where: { id: instanceId },
    });
    if (!instance) {
        return NextResponse.json({ error: 'Instance không tồn tại' }, { status: 404 });
    }

    const now = new Date();

    if (status === 'SUCCESS') {
        // Update instance to ACTIVE
        await db.crmInstance.update({
            where: { id: instanceId },
            data: {
                status: 'ACTIVE',
                crmUrl: crmUrl || `https://${instance.domain}`,
                instanceId: containerId || null,
                deployedAt: now,
                deployLog: {
                    ...(instance.deployLog as Record<string, unknown> || {}),
                    deployedAt: now.toISOString(),
                    containerId,
                },
            },
        });

        // Log event
        await db.eventLog.create({
            data: {
                workspaceId: instance.workspaceId,
                type: 'CRM_DEPLOYED',
                payloadJson: {
                    instanceId,
                    crmUrl: crmUrl || `https://${instance.domain}`,
                    containerId,
                },
            },
        });

        // Notify user
        await db.notificationQueue.create({
            data: {
                userId: instance.adminUserId || '',
                workspaceId: instance.workspaceId,
                type: 'ENTITLEMENT_GRANTED',
                title: '🎉 CRM đã sẵn sàng!',
                body: `Hệ thống CRM của bạn đã được triển khai tại ${crmUrl || `https://${instance.domain}`}. Đăng nhập để bắt đầu sử dụng.`,
                referenceType: 'ORDER',
                referenceId: instanceId,
            },
        });

        return NextResponse.json({
            ok: true,
            instanceId,
            status: 'ACTIVE',
            crmUrl: crmUrl || `https://${instance.domain}`,
        });
    } else {
        // FAILED
        await db.crmInstance.update({
            where: { id: instanceId },
            data: {
                status: 'PENDING', // reset to allow retry
                deployLog: {
                    ...(instance.deployLog as Record<string, unknown> || {}),
                    failedAt: now.toISOString(),
                    error: deployError || 'Unknown error',
                },
            },
        });

        // Log error
        await db.eventLog.create({
            data: {
                workspaceId: instance.workspaceId,
                type: 'CRM_DEPLOY_FAILED',
                payloadJson: { instanceId, error: deployError },
            },
        });

        // Notify admin
        await db.notificationQueue.create({
            data: {
                userId: instance.adminUserId || '',
                workspaceId: instance.workspaceId,
                type: 'ENTITLEMENT_GRANTED',
                title: '❌ Triển khai CRM thất bại',
                body: `Triển khai CRM tại ${instance.domain} thất bại. Hệ thống sẽ thử lại hoặc liên hệ hỗ trợ.`,
                referenceType: 'ORDER',
                referenceId: instanceId,
            },
        });

        return NextResponse.json({
            ok: false,
            instanceId,
            status: 'PENDING',
            error: deployError || 'Deploy failed',
        });
    }
}
