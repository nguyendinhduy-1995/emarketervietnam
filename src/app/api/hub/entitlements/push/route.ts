import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { signSnapshot } from '@/lib/entitlement-signing';

/**
 * POST /api/hub/entitlements/push
 * 
 * Push entitlement changes to CRM instances via webhook.
 * Instead of waiting for instance to poll, Hub pushes immediately
 * when entitlements change (suspend, addon add/remove, plan change).
 * 
 * Called internally by: billing webhook, kill switch, subscription change.
 * 
 * Body: { workspaceId, reason }
 */
export async function POST(req: NextRequest) {
    // Auth: internal or admin
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    const secret = process.env.ENTITLEMENT_SECRET || process.env.ADMIN_SECRET;
    if (secret && auth !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, reason } = await req.json();
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

    // Get instance
    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance || !instance.crmUrl) {
        return NextResponse.json({ error: 'Instance not found or no CRM URL' }, { status: 404 });
    }

    // Build fresh snapshot (same logic as /entitlements/snapshot)
    const now = new Date();
    const entitlements = await db.entitlement.findMany({
        where: {
            workspaceId,
            status: { in: ['ACTIVE', 'TRIAL', 'SUSPENDED'] },
            activeFrom: { lte: now },
        },
    });

    const subscription = await db.subscription.findFirst({
        where: { workspaceId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED'] } },
        orderBy: { createdAt: 'desc' },
    });

    const deployLog = instance.deployLog as Record<string, unknown> | null;
    const productKey = (deployLog?.productKey as string) || '';

    const features: Record<string, { enabled: boolean; tier: string; status?: string; expiresAt: string | null }> = {};
    for (const ent of entitlements) {
        features[ent.moduleKey] = {
            enabled: ent.status !== 'SUSPENDED',
            tier: ent.scope,
            status: ent.status,
            expiresAt: ent.activeTo?.toISOString() || null,
        };
    }

    const snapshot = {
        workspaceId,
        instanceId: instance.id,
        boundDomain: instance.domain,
        productKey,
        features,
        subscription: subscription ? {
            status: subscription.status,
            planKey: subscription.planKey,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
        } : null,
        isSuspended: subscription?.status === 'SUSPENDED',
        isPastDue: subscription?.status === 'PAST_DUE',
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 10 * 60_000).toISOString(),
        pushReason: reason || 'entitlement_changed',
        v: 2,
    };

    let signature: string;
    try {
        signature = signSnapshot(snapshot);
    } catch {
        const crypto = await import('crypto');
        const key = process.env.ENTITLEMENT_SECRET || 'entitlement-signing-key';
        signature = crypto.createHmac('sha256', key).update(JSON.stringify(snapshot)).digest('hex');
    }

    // Push to instance webhook
    const webhookUrl = `${instance.crmUrl}/api/entitlement/webhook`;
    let pushResult = 'unknown';

    try {
        const pushResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Hub-Signature': signature,
                'X-Hub-Algorithm': process.env.ENTITLEMENT_PRIVATE_KEY ? 'ed25519' : 'hmac-sha256',
            },
            body: JSON.stringify({ snapshot, signature }),
            signal: AbortSignal.timeout(10000),
        });
        pushResult = pushResponse.ok ? 'delivered' : `failed:${pushResponse.status}`;
    } catch (err) {
        pushResult = `error:${(err as Error).message?.slice(0, 100)}`;
    }

    // Audit log
    await db.eventLog.create({
        data: {
            workspaceId,
            type: 'ENTITLEMENT_PUSHED',
            payloadJson: {
                instanceId: instance.id,
                domain: instance.domain,
                reason,
                pushResult,
                featureCount: Object.keys(features).length,
            },
        },
    });

    return NextResponse.json({ ok: true, pushResult, featureCount: Object.keys(features).length });
}
