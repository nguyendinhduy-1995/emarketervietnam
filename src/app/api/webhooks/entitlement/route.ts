import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { invalidateEntitlementCache } from '@/lib/features/cache';

// POST /api/webhooks/entitlement — Webhook for entitlement changes
// Called when entitlements are granted/revoked/expired
export async function POST(req: NextRequest) {
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { event, workspaceId, moduleKey, entitlementId, actorUserId } = body;

    if (!event || !workspaceId) {
        return NextResponse.json({ error: 'event and workspaceId required' }, { status: 400 });
    }

    // Invalidate cache for this workspace
    invalidateEntitlementCache(workspaceId);

    // Process event
    switch (event) {
        case 'entitlement.granted': {
            // Create notification
            const memberships = await platformDb.membership.findMany({
                where: { workspaceId },
                select: { userId: true },
            });
            for (const m of memberships) {
                await platformDb.notificationQueue.create({
                    data: {
                        userId: m.userId,
                        workspaceId,
                        type: 'ENTITLEMENT_GRANTED',
                        title: `Tính năng đã được kích hoạt`,
                        body: `Module "${moduleKey}" đã được kích hoạt cho workspace.`,
                        referenceType: 'ENTITLEMENT',
                        referenceId: entitlementId || undefined,
                    },
                });
            }
            break;
        }

        case 'entitlement.revoked':
        case 'entitlement.expired': {
            const memberships = await platformDb.membership.findMany({
                where: { workspaceId },
                select: { userId: true },
            });
            for (const m of memberships) {
                await platformDb.notificationQueue.create({
                    data: {
                        userId: m.userId,
                        workspaceId,
                        type: 'ENTITLEMENT_GRANTED', // reuse type
                        title: event === 'entitlement.revoked' ? 'Tính năng đã bị thu hồi' : 'Tính năng đã hết hạn',
                        body: `Module "${moduleKey}" đã ${event === 'entitlement.revoked' ? 'bị thu hồi' : 'hết hạn'}.`,
                        referenceType: 'ENTITLEMENT',
                        referenceId: entitlementId || undefined,
                    },
                });
            }
            break;
        }
    }

    // Log event
    await platformDb.eventLog.create({
        data: {
            actorUserId: actorUserId || 'webhook',
            type: `WEBHOOK_${event.toUpperCase().replace('.', '_')}`,
            workspaceId,
            payloadJson: { event, moduleKey, entitlementId },
        },
    });

    return NextResponse.json({ ok: true, event, workspaceId });
}
