import { NextRequest, NextResponse } from 'next/server';
import {
    setCachedSnapshot,
    verifySignature,
    type EntitlementSnapshot,
} from '@/lib/entitlement';

/**
 * POST /api/entitlement/webhook
 *
 * Hub pushes entitlement changes here when:
 * - User buys/cancels add-on
 * - Subscription renews/expires/suspends
 * - Admin force-changes entitlements
 *
 * Body: { snapshot, signature }
 * Headers: X-Hub-Signature, X-Hub-Algorithm
 */
export async function POST(req: NextRequest) {
    try {
        const { snapshot, signature } = await req.json();
        const algo = req.headers.get('x-hub-algorithm') || 'hmac-sha256';

        if (!snapshot || !signature) {
            return NextResponse.json({ error: 'snapshot and signature required' }, { status: 400 });
        }

        // 1. Verify signature
        const isValid = verifySignature(snapshot, signature, algo);
        if (!isValid) {
            console.error('[ENTITLEMENT] Invalid signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        // 2. Verify binding — snapshot belongs to this instance
        const expectedWorkspace = process.env.WORKSPACE_ID;
        if (expectedWorkspace && snapshot.workspaceId !== expectedWorkspace) {
            console.error(`[ENTITLEMENT] Workspace mismatch: ${snapshot.workspaceId} ≠ ${expectedWorkspace}`);
            return NextResponse.json({ error: 'Workspace mismatch' }, { status: 403 });
        }

        // 3. Cache snapshot in memory
        setCachedSnapshot(snapshot as EntitlementSnapshot);

        // 4. Log
        const featureCount = Object.keys(snapshot.features || {}).length;
        console.log(`[ENTITLEMENT] Received snapshot: ${featureCount} features, reason: ${snapshot.pushReason}`);

        if (snapshot.isSuspended) {
            console.warn('[ENTITLEMENT] ⚠️ Instance SUSPENDED — read-only mode');
        }

        return NextResponse.json({
            ok: true,
            received: featureCount,
            suspended: snapshot.isSuspended || false,
        });
    } catch (err) {
        console.error('[ENTITLEMENT] Webhook error:', err);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
