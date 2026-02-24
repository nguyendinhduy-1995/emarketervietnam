import { platformDb } from '@/lib/db/platform';

/**
 * Log an admin action for audit trail.
 * Call this whenever an admin/staff modifies critical data.
 *
 * @example
 * await logAdminAction({
 *     actorUserId: session.userId,
 *     actorName: session.name,
 *     action: 'GRANT_ENTITLEMENT',
 *     resource: 'Entitlement',
 *     resourceId: entitlement.id,
 *     workspaceId: entitlement.workspaceId,
 *     after: entitlement,
 *     reason: 'Manual grant via CRM',
 *     ip: req.headers.get('x-forwarded-for'),
 * });
 */
export async function logAdminAction(params: {
    actorUserId: string;
    actorName?: string;
    action: string;
    resource: string;
    resourceId: string;
    workspaceId?: string | null;
    before?: unknown;
    after?: unknown;
    reason?: string;
    ip?: string | null;
}) {
    try {
        await platformDb.adminAuditLog.create({
            data: {
                actorUserId: params.actorUserId,
                actorName: params.actorName || undefined,
                action: params.action,
                resource: params.resource,
                resourceId: params.resourceId,
                workspaceId: params.workspaceId || undefined,
                before: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
                after: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
                reason: params.reason || undefined,
                ip: params.ip || undefined,
            },
        });
    } catch (error) {
        // Never fail the parent operation because of audit logging
        console.error('[AUDIT LOG ERROR]', error);
    }
}

/**
 * Standard action constants
 */
export const AuditAction = {
    GRANT_ENTITLEMENT: 'GRANT_ENTITLEMENT',
    REVOKE_ENTITLEMENT: 'REVOKE_ENTITLEMENT',
    UPDATE_PLAN: 'UPDATE_PLAN',
    WALLET_ADJUST: 'WALLET_ADJUST',
    USER_UPDATE: 'USER_UPDATE',
    PRODUCT_UPDATE: 'PRODUCT_UPDATE',
    REFUND: 'REFUND',
    SUBSCRIPTION_RENEW: 'SUBSCRIPTION_RENEW',
    SUBSCRIPTION_CANCEL: 'SUBSCRIPTION_CANCEL',
    COUPON_CREATE: 'COUPON_CREATE',
    COUPON_UPDATE: 'COUPON_UPDATE',
} as const;
