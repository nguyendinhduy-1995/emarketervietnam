import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/admin/suspend-instance
 * 
 * Kill switch: Hub admin suspends a CRM instance.
 * - Sets CrmInstance.status = SUSPENDED
 * - Sets all Entitlements to SUSPENDED (except CORE)
 * - Sets Subscription to SUSPENDED
 * - Logs audit event
 * 
 * CRM instance will pick this up on next entitlement revalidation (≤30 min).
 */
export async function POST(req: NextRequest) {
    // Simple admin auth (bearer token)
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
    if (!auth || auth !== adminSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, reason, action } = body;

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    const targetAction = action || 'SUSPEND'; // SUSPEND | REACTIVATE

    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    if (targetAction === 'SUSPEND') {
        // ── Kill Switch: Suspend ──
        await db.$transaction([
            // 1. Suspend CRM instance
            db.crmInstance.update({
                where: { workspaceId },
                data: { status: 'SUSPENDED' },
            }),

            // 2. Suspend all non-core entitlements  
            db.entitlement.updateMany({
                where: {
                    workspaceId,
                    status: 'ACTIVE',
                    moduleKey: { not: { startsWith: 'CORE_' } },
                },
                data: { status: 'SUSPENDED', revokeReason: reason || 'Admin kill switch' },
            }),

            // 3. Suspend subscription
            db.subscription.updateMany({
                where: { workspaceId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
                data: { status: 'SUSPENDED' },
            }),

            // 4. Audit log
            db.eventLog.create({
                data: {
                    type: 'INSTANCE_SUSPENDED',
                    payloadJson: { workspaceId, instanceId: instance.id, reason, action: targetAction },
                },
            }),

            // 5. Notification to user
            ...(instance.adminUserId ? [db.notificationQueue.create({
                data: {
                    userId: instance.adminUserId,
                    type: 'ENTITLEMENT_GRANTED',
                    title: '⚠️ CRM đã bị tạm ngưng',
                    body: reason || 'Tài khoản CRM của bạn đã bị tạm ngưng. Liên hệ hỗ trợ để biết thêm.',
                    referenceType: 'CRM_INSTANCE', referenceId: instance.id,
                },
            })] : []),
        ]);

        return NextResponse.json({ ok: true, action: 'SUSPENDED', workspaceId });

    } else if (targetAction === 'REACTIVATE') {
        // ── Reactivate ──
        await db.$transaction([
            db.crmInstance.update({
                where: { workspaceId },
                data: { status: 'ACTIVE' },
            }),

            db.entitlement.updateMany({
                where: { workspaceId, status: 'SUSPENDED' },
                data: { status: 'ACTIVE', revokeReason: null },
            }),

            db.subscription.updateMany({
                where: { workspaceId, status: 'SUSPENDED' },
                data: { status: 'ACTIVE' },
            }),

            db.eventLog.create({
                data: {
                    type: 'INSTANCE_REACTIVATED',
                    payloadJson: { workspaceId, instanceId: instance.id, reason, action: targetAction },
                },
            }),

            ...(instance.adminUserId ? [db.notificationQueue.create({
                data: {
                    userId: instance.adminUserId,
                    type: 'ENTITLEMENT_GRANTED',
                    title: '✅ CRM đã được kích hoạt lại',
                    body: 'Tài khoản CRM của bạn đã được kích hoạt lại. Mọi tính năng đã hoạt động bình thường.',
                    referenceType: 'CRM_INSTANCE', referenceId: instance.id,
                },
            })] : []),
        ]);

        return NextResponse.json({ ok: true, action: 'REACTIVATED', workspaceId });
    }

    return NextResponse.json({ error: 'Invalid action. Use SUSPEND or REACTIVATE.' }, { status: 400 });
}
