import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { OrderStatus } from '@/lib/order-status';

/**
 * POST /api/hub/deploy/callback
 * 
 * Called by the external deployer when CRM instance deployment is complete.
 * Updates CrmInstance, Order, Entitlement statuses to ACTIVE.
 * Sends notification to user with login credentials.
 * 
 * Auth: Bearer token (DEPLOY_CALLBACK_SECRET)
 * Body: { instanceId, status, crmUrl, tempPassword, error? }
 */
export async function POST(req: NextRequest) {
    // Authenticate deployer
    const authHeader = req.headers.get('authorization');
    const expectedToken = process.env.DEPLOY_CALLBACK_SECRET || 'deploy-secret-key';
    if (authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { instanceId, status, crmUrl, tempPassword, error: deployError } = body;

    if (!instanceId) {
        return NextResponse.json({ error: 'instanceId required' }, { status: 400 });
    }

    const instance = await db.crmInstance.findUnique({
        where: { id: instanceId },
    });

    if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    if (status === 'DONE' || status === 'ACTIVE') {
        // Success path
        await db.$transaction(async (tx) => {
            // 1. Update instance
            await tx.crmInstance.update({
                where: { id: instanceId },
                data: {
                    status: 'ACTIVE',
                    crmUrl: crmUrl || `https://${instance.domain}`,
                    deployedAt: new Date(),
                    deployLog: {
                        ...(instance.deployLog as Record<string, unknown> || {}),
                        completedAt: new Date().toISOString(),
                        crmUrl,
                    },
                },
            });

            // 2. Update related orders
            await tx.commerceOrder.updateMany({
                where: {
                    workspaceId: instance.workspaceId,
                    status: { in: [OrderStatus.DEPLOYING, OrderStatus.DOMAIN_VERIFIED] },
                },
                data: { status: OrderStatus.DELIVERED_ACTIVE },
            });

            // 3. Activate pending entitlements
            await tx.entitlement.updateMany({
                where: {
                    workspaceId: instance.workspaceId,
                    status: 'PENDING',
                },
                data: { status: 'ACTIVE' },
            });

            // 4. Notify user
            await tx.notificationQueue.create({
                data: {
                    userId: instance.adminUserId || '',
                    workspaceId: instance.workspaceId,
                    type: 'ENTITLEMENT_GRANTED',
                    title: '🎉 CRM đã sẵn sàng!',
                    body: `Hệ thống CRM tại ${instance.domain} đã được triển khai thành công. Truy cập ${crmUrl || `https://${instance.domain}`} để bắt đầu.${tempPassword ? ` Mật khẩu tạm: ${tempPassword}` : ''}`,
                    referenceType: 'ORDER',
                    referenceId: instanceId,
                },
            });
        });

        // Log
        await db.eventLog.create({
            data: {
                workspaceId: instance.workspaceId,
                type: 'CRM_DEPLOY_COMPLETED',
                payloadJson: { instanceId, domain: instance.domain, crmUrl },
            },
        });

        return NextResponse.json({
            ok: true,
            message: `CRM instance ${instance.domain} deployed successfully`,
        });
    } else if (status === 'FAILED') {
        await db.crmInstance.update({
            where: { id: instanceId },
            data: {
                status: 'PENDING',
                deployLog: {
                    ...(instance.deployLog as Record<string, unknown> || {}),
                    lastError: deployError,
                    failedAt: new Date().toISOString(),
                },
            },
        });

        await db.notificationQueue.create({
            data: {
                userId: instance.adminUserId || '',
                workspaceId: instance.workspaceId,
                type: 'SYSTEM_ALERT',
                title: '❌ Triển khai CRM thất bại',
                body: `Triển khai CRM tại ${instance.domain} gặp lỗi: ${deployError || 'Liên hệ hỗ trợ'}`,
                referenceType: 'ORDER',
                referenceId: instanceId,
            },
        });

        return NextResponse.json({ ok: true, message: 'Failure recorded' });
    }

    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
}
