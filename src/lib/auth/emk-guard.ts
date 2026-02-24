import { NextRequest, NextResponse } from 'next/server';
import { getCrmSession, type TokenPayload } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

/**
 * Require eMarketer internal role (ADMIN/OPS/SALES/CS)
 * Uses crm_token cookie (separate from Hub token)
 */
export async function requireEmkRole(
    req: NextRequest,
    allowedRoles: string[] = ['ADMIN', 'OPS', 'SALES', 'CS']
): Promise<{ user: TokenPayload; emkRole: string } | NextResponse> {
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
        return { user: session, emkRole: dbUser.emkRole || 'ADMIN' };
    }

    if (!dbUser?.emkRole || !allowedRoles.includes(dbUser.emkRole)) {
        return NextResponse.json({ error: 'Không có quyền truy cập – chỉ nội bộ eMarketer' }, { status: 403 });
    }

    return { user: session, emkRole: dbUser.emkRole };
}
