import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type TokenPayload } from './jwt';
import { platformDb } from '../db/platform';

export interface AuthContext {
    user: TokenPayload;
    workspaceId: string;
    role: string;
}

/**
 * Extract and verify auth from request.
 * Returns null if not authenticated.
 */
export async function getAuthFromRequest(
    req: NextRequest
): Promise<TokenPayload | null> {
    const token = req.cookies.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

/**
 * Require authentication. Returns 401 if not authenticated.
 */
export async function requireAuth(
    req: NextRequest
): Promise<{ user: TokenPayload } | NextResponse> {
    const user = await getAuthFromRequest(req);
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return { user };
}

/**
 * Require auth + workspace membership with specific roles.
 */
export async function requireWorkspaceRole(
    req: NextRequest,
    workspaceId: string,
    allowedRoles: string[] = ['OWNER', 'ADMIN', 'STAFF']
): Promise<AuthContext | NextResponse> {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const membership = await platformDb.membership.findUnique({
        where: {
            workspaceId_userId: {
                workspaceId,
                userId: authResult.user.userId,
            },
        },
    });

    if (!membership || !allowedRoles.includes(membership.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return {
        user: authResult.user,
        workspaceId,
        role: membership.role,
    };
}

/**
 * Require platform admin.
 */
export async function requireAdmin(
    req: NextRequest
): Promise<{ user: TokenPayload } | NextResponse> {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    if (!authResult.user.isAdmin) {
        return NextResponse.json({ error: 'Forbidden – admin only' }, { status: 403 });
    }

    return authResult;
}

/**
 * Get workspaceId from request - either from header or first membership
 */
export async function resolveWorkspaceId(
    req: NextRequest,
    user: TokenPayload
): Promise<string | null> {
    // Check header first
    const headerWsId = req.headers.get('x-workspace-id');
    if (headerWsId) return headerWsId;

    // Fall back to first membership
    const membership = await platformDb.membership.findFirst({
        where: { userId: user.userId },
        orderBy: { createdAt: 'asc' },
    });

    return membership?.workspaceId ?? null;
}
