import { NextRequest, NextResponse } from 'next/server';
import { verifyLaunchToken } from '@/lib/auth/launch-token';
import { signEntitlementSnapshot } from '@/lib/auth/entitlement-signer';

/**
 * POST /api/hub/launch/verify
 * 
 * App calls this to verify a launch token received from Hub redirect.
 * 
 * Body: { token }
 * Returns: { valid, userId, workspaceId, entitlements, signedSnapshot }
 * 
 * App uses the response to create a local session + cache entitlements.
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { token } = body;

        if (!token) {
            return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 });
        }

        // 1. Verify launch token (60s TTL)
        const payload = await verifyLaunchToken(token);
        if (!payload) {
            return NextResponse.json(
                { valid: false, error: 'Token không hợp lệ hoặc đã hết hạn', code: 'INVALID_TOKEN' },
                { status: 403 },
            );
        }

        // 2. Optionally return signed entitlement snapshot
        // so the App can cache it and avoid repeated calls
        const signedEntitlement = await signEntitlementSnapshot(payload.workspaceId);

        return NextResponse.json({
            valid: true,
            userId: payload.userId,
            userName: payload.userName,
            email: payload.email,
            workspaceId: payload.workspaceId,
            appKey: payload.appKey,
            entitlements: payload.entitlements,
            signedEntitlement, // { snapshot, signature }
        });
    } catch {
        return NextResponse.json(
            { valid: false, error: 'Invalid request' },
            { status: 400 },
        );
    }
}
