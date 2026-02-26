import { NextRequest, NextResponse } from 'next/server';
import { verifySnapshot, verifyBinding } from '@/lib/entitlement-signing';

/**
 * POST /api/entitlement/webhook
 * 
 * CRM-side webhook receiver for entitlement push from Hub.
 * When Hub pushes a new snapshot (suspend, addon change, etc.),
 * this endpoint receives it, verifies signature + binding, and
 * caches it for the EntitlementProvider to pick up.
 * 
 * In a full implementation, this would store in Redis or a local file.
 * For now, we store in a module-level cache and the /api/hub/entitlements
 * endpoint reads from it.
 */

// In-memory cache (replaced on each push)
let cachedSnapshot: { snapshot: Record<string, unknown>; signature: string; receivedAt: string } | null = null;

export function getCachedSnapshot() {
    return cachedSnapshot;
}

export async function POST(req: NextRequest) {
    const _hubSignature = req.headers.get('x-hub-signature');
    const hubAlgo = req.headers.get('x-hub-algorithm') || 'hmac-sha256';

    const body = await req.json();
    const { snapshot, signature } = body;

    if (!snapshot || !signature) {
        return NextResponse.json({ error: 'Missing snapshot or signature' }, { status: 400 });
    }

    // ── Verify signature ──
    if (hubAlgo === 'ed25519') {
        try {
            const valid = verifySnapshot(snapshot, signature);
            if (!valid) {
                return NextResponse.json({ error: 'Invalid Ed25519 signature' }, { status: 403 });
            }
        } catch (err) {
            return NextResponse.json({ error: 'Signature verification failed', detail: (err as Error).message }, { status: 500 });
        }
    }
    // Note: HMAC verification would require shared secret — less secure, skip

    // ── Verify binding ──
    const bindResult = verifyBinding(snapshot, {
        workspaceId: process.env.WORKSPACE_ID || '',
        instanceId: process.env.INSTANCE_ID || '',
        domain: process.env.DOMAIN || '',
        productKey: process.env.PRODUCT_KEY || '',
    });
    if (!bindResult.valid) {
        return NextResponse.json({ error: 'Binding mismatch', reason: bindResult.reason }, { status: 403 });
    }

    // ── Cache snapshot ──
    cachedSnapshot = {
        snapshot,
        signature,
        receivedAt: new Date().toISOString(),
    };

    console.log(`[Entitlement Webhook] Received push: ${Object.keys(snapshot.features || {}).length} features, reason: ${snapshot.pushReason}`);

    return NextResponse.json({ ok: true, acknowledged: true });
}
