import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { signSnapshot } from '@/lib/entitlement-signing';

/**
 * GET /api/hub/entitlements/snapshot
 * 
 * CRM instance calls this to get a signed entitlement snapshot.
 * 
 * Security:
 * - Ed25519 signed (Hub private key) → instance verifies with public key
 * - Full binding: workspaceId + instanceId + boundDomain + productKey
 * - TTL: 10 minutes
 * - Revalidate: 5 minutes
 * - Grace: 24h (if Hub unavailable → use cached, flag hubUnavailable)
 * 
 * Kill switch:
 * - SUSPENDED subscription → all non-core features disabled
 * - PAST_DUE → show renewal banner, keep core
 */
export async function GET(req: NextRequest) {
    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    const domain = req.nextUrl.searchParams.get('domain');
    const instanceId = req.nextUrl.searchParams.get('instanceId');

    if (!workspaceId || !domain) {
        return NextResponse.json({ error: 'workspaceId, domain required' }, { status: 400 });
    }

    // Verify CRM instance binding
    const instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance || instance.status === 'DELETED') {
        return NextResponse.json({ error: 'Instance not found' }, { status: 403 });
    }

    // Domain binding check
    const normalizedDomain = domain.toLowerCase().trim();
    if (instance.domain !== normalizedDomain) {
        return NextResponse.json({ error: 'Domain mismatch' }, { status: 403 });
    }

    // InstanceId binding check (if provided)
    if (instanceId && instance.id !== instanceId) {
        return NextResponse.json({ error: 'Instance ID mismatch' }, { status: 403 });
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

    // Build features map
    const features: Record<string, {
        enabled: boolean; tier: string; status?: string;
        expiresAt: string | null; limits?: unknown; flags?: unknown;
    }> = {};

    for (const ent of entitlements) {
        features[ent.moduleKey] = {
            enabled: true,
            tier: ent.scope,
            status: ent.status,
            expiresAt: ent.activeTo?.toISOString() || null,
            limits: ent.limits ?? undefined,
            flags: ent.featureFlags ?? undefined,
        };
    }

    // Kill switch: SUSPENDED → disable all non-core; PAST_DUE → flag only
    const isSuspended = subscription?.status === 'SUSPENDED';
    const isPastDue = subscription?.status === 'PAST_DUE';
    const deployLog = instance.deployLog as Record<string, unknown> | null;
    const productKey = (deployLog?.productKey as string) || '';

    if (isSuspended) {
        for (const key of Object.keys(features)) {
            if (!key.startsWith('CORE_') && key !== productKey) {
                features[key] = { ...features[key], enabled: false };
            }
        }
    }

    // TTL: 10 minutes, revalidate every 5 minutes
    const TTL_MS = 10 * 60_000;       // 10 min
    const REVALIDATE_MS = 5 * 60_000;  // 5 min
    const GRACE_MS = 24 * 3600_000;    // 24h grace if Hub unreachable

    const snapshot = {
        // ── Full binding ──
        workspaceId,
        instanceId: instance.id,
        boundDomain: instance.domain,
        productKey,
        // ── Features ──
        features,
        // ── Subscription ──
        subscription: subscription ? {
            status: subscription.status,
            planKey: subscription.planKey,
            currentPeriodEnd: subscription.currentPeriodEnd?.toISOString(),
            trialEndsAt: subscription.trialEndsAt?.toISOString(),
        } : null,
        // ── Flags ──
        isSuspended,
        isPastDue,
        // ── Timing ──
        generatedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + TTL_MS).toISOString(),
        revalidateAfterMs: REVALIDATE_MS,
        graceMs: GRACE_MS,
        // ── Schema version ──
        v: 2,
    };

    // Ed25519 sign
    let signature: string;
    try {
        signature = signSnapshot(snapshot);
    } catch (err) {
        // Fallback HMAC if Ed25519 key not configured yet (migration period)
        const crypto = await import('crypto');
        const fallbackKey = process.env.ENTITLEMENT_SECRET || 'entitlement-signing-key';
        signature = crypto.createHmac('sha256', fallbackKey).update(JSON.stringify(snapshot)).digest('hex');
    }

    return NextResponse.json({
        snapshot,
        signature,
        algo: process.env.ENTITLEMENT_PRIVATE_KEY ? 'ed25519' : 'hmac-sha256',
    });
}
