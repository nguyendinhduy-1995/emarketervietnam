import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/webhooks/entitlement
 * 
 * Internal webhook: Hub notifies CRM instances when entitlements change.
 * Called by Hub cron/admin actions when entitlement status changes.
 * 
 * Authenticated via WEBHOOK_SECRET header.
 * 
 * Body: { workspaceId, action: 'REVOKE' | 'SUSPEND' | 'REACTIVATE', moduleKey, reason? }
 * 
 * Hub → CRM: signed notification so CRM can update its local state.
 * If CRM has a webhook URL registered, Hub forwards the notification.
 */
export async function POST(req: NextRequest) {
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { workspaceId, action, moduleKey, reason } = body;

    if (!workspaceId || !action || !moduleKey) {
        return NextResponse.json(
            { error: 'workspaceId, action, moduleKey required' },
            { status: 400 },
        );
    }

    const now = new Date();

    // 1. Apply action to entitlement
    if (action === 'REVOKE') {
        await db.entitlement.updateMany({
            where: { workspaceId, moduleKey, status: 'ACTIVE' },
            data: {
                status: 'REVOKED',
                revokedAt: now,
                revokeReason: reason || 'Webhook revocation',
            },
        });

        // If CRM entitlement, also suspend the instance
        if (moduleKey === 'CRM_CORE') {
            await db.crmInstance.updateMany({
                where: { workspaceId, status: 'ACTIVE' },
                data: { status: 'SUSPENDED', suspendedAt: now },
            });
        }
    } else if (action === 'SUSPEND') {
        await db.entitlement.updateMany({
            where: { workspaceId, moduleKey, status: 'ACTIVE' },
            data: {
                status: 'INACTIVE',
                revokeReason: reason || 'Suspended via webhook',
            },
        });

        if (moduleKey === 'CRM_CORE') {
            await db.crmInstance.updateMany({
                where: { workspaceId, status: 'ACTIVE' },
                data: { status: 'SUSPENDED', suspendedAt: now },
            });
        }
    } else if (action === 'REACTIVATE') {
        await db.entitlement.updateMany({
            where: {
                workspaceId,
                moduleKey,
                status: { in: ['INACTIVE', 'REVOKED'] },
            },
            data: {
                status: 'ACTIVE',
                revokedAt: null,
                revokeReason: null,
            },
        });

        if (moduleKey === 'CRM_CORE') {
            await db.crmInstance.updateMany({
                where: { workspaceId, status: 'SUSPENDED' },
                data: { status: 'ACTIVE', suspendedAt: null },
            });
        }
    } else {
        return NextResponse.json(
            { error: `Unknown action: ${action}. Must be REVOKE | SUSPEND | REACTIVATE` },
            { status: 400 },
        );
    }

    // 2. Forward to CRM instance webhook (if registered)
    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (instance?.crmUrl) {
        try {
            await fetch(`${instance.crmUrl}/api/webhooks/hub-entitlement`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-hub-secret': process.env.ENTITLEMENT_SIGNING_KEY || '',
                },
                body: JSON.stringify({
                    workspaceId,
                    action,
                    moduleKey,
                    reason,
                    timestamp: now.toISOString(),
                }),
                signal: AbortSignal.timeout(5000), // 5s timeout
            });
        } catch {
            // CRM unreachable — log but don't block
            console.warn(`[WEBHOOK] CRM instance at ${instance.crmUrl} unreachable for ${action}`);
        }
    }

    // 3. Log event
    await db.eventLog.create({
        data: {
            workspaceId,
            type: `ENTITLEMENT_${action}`,
            payloadJson: { moduleKey, reason, source: 'webhook' },
        },
    });

    return NextResponse.json({
        ok: true,
        workspaceId,
        action,
        moduleKey,
        timestamp: now.toISOString(),
    });
}
