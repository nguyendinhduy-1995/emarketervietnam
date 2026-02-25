import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import crypto from 'crypto';

/**
 * GET /api/hub/entitlements/snapshot
 * 
 * CRM instance calls this to get a signed entitlement snapshot.
 * Verifies instanceId + domain binding.
 * Returns: { snapshot, signature }
 */
export async function GET(req: NextRequest) {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const domain = req.nextUrl.searchParams.get('domain');

    if (!workspaceId || !domain) {
        return NextResponse.json({ error: 'workspaceId, domain required' }, { status: 400 });
    }

    // Verify CRM instance binding
    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance || instance.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Instance not active' }, { status: 403 });
    }

    if (instance.domain !== domain.toLowerCase()) {
        return NextResponse.json({ error: 'Domain mismatch' }, { status: 403 });
    }

    // Get active entitlements
    const now = new Date();
    const entitlements = await db.entitlement.findMany({
        where: {
            workspaceId,
            status: 'ACTIVE',
            activeFrom: { lte: now },
            OR: [{ activeTo: null }, { activeTo: { gt: now } }],
        },
    });

    // Get subscription info
    const subscription = await db.subscription.findFirst({
        where: { workspaceId, status: { in: ['ACTIVE', 'TRIAL'] } },
    });

    const features: Record<string, { enabled: boolean; tier: string; expiresAt: string | null; limits?: unknown; flags?: unknown }> = {};
    for (const ent of entitlements) {
        features[ent.moduleKey] = {
            enabled: true, tier: ent.scope,
            expiresAt: ent.activeTo?.toISOString() || null,
            limits: ent.limits ?? undefined, flags: ent.featureFlags ?? undefined,
        };
    }

    const snapshot = {
        workspaceId, instanceId: instance.id, boundDomain: instance.domain,
        features,
        subscription: subscription ? {
            status: subscription.status, planKey: subscription.planKey,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
            trialEndsAt: subscription.trialEndsAt?.toISOString(),
        } : null,
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + 3600_000).toISOString(),
    };

    const signingKey = process.env.ENTITLEMENT_SECRET || 'entitlement-signing-key';
    const signature = crypto.createHmac('sha256', signingKey).update(JSON.stringify(snapshot)).digest('hex');

    return NextResponse.json({ snapshot, signature });
}
