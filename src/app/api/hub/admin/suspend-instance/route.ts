import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

/**
 * POST /api/hub/admin/suspend-instance
 * 
 * Kill switch: Hub admin suspends or reactivates a CRM instance.
 * 
 * Security:
 * - Requires authenticated admin user (session.isAdmin)
 * - Logs: who, when, which instance, reason
 * - Cascades: CrmInstance + Entitlements + Subscription
 * 
 * Body: { workspaceId, reason, action: "SUSPEND" | "REACTIVATE" }
 */
export async function POST(req: NextRequest) {
    // ── Auth: require admin session ──
    const session = await getAnySession();
    if (!session) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Check admin role
    const user = await db.user.findUnique({ where: { id: session.userId }, select: { isAdmin: true, name: true } });
    if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Chỉ admin mới có quyền thao tác này' }, { status: 403 });
    }

    const body = await req.json();
    const { workspaceId, reason, action } = body;

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }
    if (!reason || reason.trim().length < 5) {
        return NextResponse.json({ error: 'reason required (min 5 chars)' }, { status: 400 });
    }

    const targetAction = action || 'SUSPEND';
    if (!['SUSPEND', 'REACTIVATE'].includes(targetAction)) {
        return NextResponse.json({ error: 'Invalid action. Use SUSPEND or REACTIVATE.' }, { status: 400 });
    }

    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 });
    }

    const auditPayload = {
        workspaceId,
        instanceId: instance.id,
        domain: instance.domain,
        action: targetAction,
        reason: reason.trim(),
        performedBy: session.userId,
        performedByName: user.name,
        performedAt: new Date().toISOString(),
    };

    if (targetAction === 'SUSPEND') {
        await db.$transaction([
            // 1. Suspend instance
            db.crmInstance.update({
                where: { workspaceId },
                data: { status: 'SUSPENDED' },
            }),

            // 2. Suspend non-core entitlements
            db.entitlement.updateMany({
                where: {
                    workspaceId,
                    status: { in: ['ACTIVE', 'TRIAL'] },
                    moduleKey: { not: { startsWith: 'CORE_' } },
                },
                data: { status: 'SUSPENDED', revokeReason: reason.trim() },
            }),

            // 3. Suspend subscription
            db.subscription.updateMany({
                where: { workspaceId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE'] } },
                data: { status: 'SUSPENDED' },
            }),

            // 4. Audit log (who, when, what, why)
            db.eventLog.create({
                data: {
                    workspaceId,
                    actorUserId: session.userId,
                    type: 'INSTANCE_SUSPENDED',
                    payloadJson: auditPayload,
                },
            }),

            // 5. Notification (if admin user exists)
            ...(instance.adminUserId ? [db.notificationQueue.create({
                data: {
                    userId: instance.adminUserId,
                    workspaceId,
                    type: 'ENTITLEMENT_GRANTED',
                    title: '⚠️ CRM đã bị tạm ngưng',
                    body: `Lý do: ${reason.trim()}. Liên hệ hỗ trợ để biết thêm.`,
                    referenceType: 'CRM_INSTANCE',
                    referenceId: instance.id,
                },
            })] : []),
        ]);

        return NextResponse.json({ ok: true, action: 'SUSPENDED', workspaceId, audit: auditPayload });

    } else {
        // REACTIVATE
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
                    workspaceId,
                    actorUserId: session.userId,
                    type: 'INSTANCE_REACTIVATED',
                    payloadJson: auditPayload,
                },
            }),

            ...(instance.adminUserId ? [db.notificationQueue.create({
                data: {
                    userId: instance.adminUserId,
                    workspaceId,
                    type: 'ENTITLEMENT_GRANTED',
                    title: '✅ CRM đã được kích hoạt lại',
                    body: 'Mọi tính năng đã hoạt động bình thường.',
                    referenceType: 'CRM_INSTANCE',
                    referenceId: instance.id,
                },
            })] : []),
        ]);

        return NextResponse.json({ ok: true, action: 'REACTIVATED', workspaceId, audit: auditPayload });
    }
}
