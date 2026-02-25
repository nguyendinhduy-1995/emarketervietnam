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

    // Get active + trial entitlements
    const now = new Date();
    const entitlements = await db.entitlement.findMany({
        where: {
            workspaceId,
            status: { in: ['ACTIVE', 'TRIAL'] },
            activeFrom: { lte: now },
            OR: [{ activeTo: null }, { activeTo: { gt: now } }],
        },
    });

    // Get subscription info (include PAST_DUE + SUSPENDED for kill switch)
    const subscription = await db.subscription.findFirst({
        where: { workspaceId, status: { in: ['ACTIVE', 'TRIAL', 'PAST_DUE', 'SUSPENDED'] } },
        orderBy: { createdAt: 'desc' },
    });

    const features: Record<string, { enabled: boolean; tier: string; status?: string; expiresAt: string | null; limits?: unknown; flags?: unknown }> = {};
    for (const ent of entitlements) {
        features[ent.moduleKey] = {
            enabled: true, tier: ent.scope, status: ent.status,
            expiresAt: ent.activeTo?.toISOString() || null,
            limits: ent.limits ?? undefined, flags: ent.featureFlags ?? undefined,
        };
    }

    // Kill switch: if subscription is SUSPENDED or PAST_DUE, only keep CORE features
    const isSuspended = subscription?.status === 'SUSPENDED';
    const isPastDue = subscription?.status === 'PAST_DUE';
    if (isSuspended) {
        // Kill all non-core features
        for (const key of Object.keys(features)) {
            const deployLog = instance.deployLog as Record<string, unknown> | null;
            if (!key.startsWith('CORE_') && key !== deployLog?.productKey) {
                features[key] = { ...features[key], enabled: false };
            }
        }
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
        // 30-minute revalidation interval (as per SPEC FINAL)
        expiresAt: new Date(now.getTime() + 30 * 60_000).toISOString(),
        revalidateAfterMs: 30 * 60_000,
    };

    const signingKey = process.env.ENTITLEMENT_SECRET || 'entitlement-signing-key';
    const signature = crypto.createHmac('sha256', signingKey).update(JSON.stringify(snapshot)).digest('hex');

    return NextResponse.json({ snapshot, signature });
}
