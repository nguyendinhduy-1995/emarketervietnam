import { NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { resolveUserWorkspace } from '@/lib/auth/entitlement-guard';
import { signEntitlementSnapshot } from '@/lib/auth/entitlement-signer';

/**
 * GET /api/hub/entitlements/snapshot
 * 
 * Returns a signed entitlement snapshot for the user's workspace.
 * CRM/App calls this periodically to cache entitlements locally.
 * 
 * Response: { snapshot, signature }
 * CRM/App verifies signature with shared ENTITLEMENT_SIGNING_KEY.
 */
export async function GET() {
    const session = await getAnySession();
    if (!session) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const workspaceId = await resolveUserWorkspace(session.userId);
    if (!workspaceId) {
        return NextResponse.json({
            error: 'Không tìm thấy workspace',
            code: 'NO_WORKSPACE',
        }, { status: 404 });
    }

    const signed = await signEntitlementSnapshot(workspaceId);

    return NextResponse.json(signed, {
        headers: {
            'Cache-Control': 'private, max-age=300', // 5 min client cache
        },
    });
}
