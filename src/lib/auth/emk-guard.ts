import { NextRequest, NextResponse } from 'next/server';
import { getCrmSession, getAnySession, type TokenPayload } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

/**
 * Require eMarketer internal role (ADMIN/OPS/SALES/CS)
 * Uses crm_token cookie (separate from Hub token)
 */
export async function requireEmkRole(
    req: NextRequest,
    allowedRoles: string[] = ['ADMIN', 'OPS', 'SALES', 'CS']
): Promise<{ user: TokenPayload; emkRole: string; workspaceId?: string } | NextResponse> {
    const session = await getCrmSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized – CRM login required' }, { status: 401 });
    }

    // Check isAdmin + emkRole from DB (not JWT, which may be stale)
    const dbUser = await platformDb.user.findUnique({
        where: { id: session.userId },
        select: { emkRole: true, isAdmin: true },
    });

    // Platform admin always has access
    if (dbUser?.isAdmin) {
        return {
            user: session,
            emkRole: dbUser.emkRole || 'ADMIN',
            workspaceId: session.workspaceId,
        };
    }

    if (!dbUser?.emkRole || !allowedRoles.includes(dbUser.emkRole)) {
        return NextResponse.json({ error: 'Không có quyền truy cập – chỉ nội bộ eMarketer' }, { status: 403 });
    }

    return {
        user: session,
        emkRole: dbUser.emkRole,
        workspaceId: session.workspaceId,
    };
}

/**
 * Require Tenant Admin — user must be ADMIN of the specific workspace.
 * Uses Hub token or CRM token (whichever found).
 * Pass workspaceId explicitly, or derive from JWT.
 */
export async function requireTenantAdmin(
    req: NextRequest,
    targetWorkspaceId?: string
): Promise<{ user: TokenPayload; workspaceId: string; role: string } | NextResponse> {
    const session = await getAnySession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const wsId = targetWorkspaceId || session.workspaceId || req.headers.get('x-workspace-id');
    if (!wsId) {
        return NextResponse.json({ error: 'Workspace không xác định' }, { status: 400 });
    }

    const membership = await platformDb.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: session.userId } },
    });

    if (!membership) {
        return NextResponse.json({ error: 'Bạn không thuộc workspace này' }, { status: 403 });
    }

    if (membership.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Chỉ Admin workspace mới có quyền' }, { status: 403 });
    }

    return { user: session, workspaceId: wsId, role: membership.role };
}

/**
 * Require Platform Admin — global admin (isAdmin=true in User table)
 */
export async function requirePlatformAdmin(
    _req: NextRequest
): Promise<{ user: TokenPayload } | NextResponse> {
    const session = await getAnySession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await platformDb.user.findUnique({
        where: { id: session.userId },
        select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
        return NextResponse.json({ error: 'Chỉ Platform Admin mới có quyền' }, { status: 403 });
    }

    return { user: session };
}

/**
 * Get workspace context from request (for CRM ops routes).
 * Looks for: header X-Workspace-Id → JWT workspaceId → query param wsId
 */
export function getWorkspaceFromRequest(
    req: NextRequest,
    session: TokenPayload
): string | null {
    return req.headers.get('x-workspace-id')
        || session.workspaceId
        || req.nextUrl.searchParams.get('wsId')
        || null;
}
