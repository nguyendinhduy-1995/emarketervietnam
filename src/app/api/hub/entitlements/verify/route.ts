import { NextRequest, NextResponse } from 'next/server';
import {
    verifyEntitlementSignature,
    type EntitlementSnapshot,
} from '@/lib/auth/entitlement-signer';

/**
 * POST /api/hub/entitlements/verify
 * 
 * CRM/App sends { snapshot, signature } → Hub verifies HMAC → returns valid/invalid.
 * 
 * This is the "phone home" endpoint for CRM instances that can't verify locally
 * (e.g., they don't have the signing key and rely on Hub for verification).
 * 
 * For CRMs that DO have the key, they can verify offline using the same
 * verifyEntitlementSignature() function.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { snapshot, signature } = body as {
            snapshot: EntitlementSnapshot;
            signature: string;
        };

        if (!snapshot || !signature) {
            return NextResponse.json(
                { valid: false, error: 'Missing snapshot or signature' },
                { status: 400 },
            );
        }

        const result = verifyEntitlementSignature(snapshot, signature);

        if (!result.valid) {
            return NextResponse.json(
                { valid: false, reason: result.reason },
                { status: 403 },
            );
        }

        return NextResponse.json({
            valid: true,
            workspaceId: snapshot.workspaceId,
            entitlementCount: snapshot.entitlements.length,
            expiresAt: snapshot.expiresAt,
        });
    } catch {
        return NextResponse.json(
            { valid: false, error: 'Invalid request body' },
            { status: 400 },
        );
    }
}
