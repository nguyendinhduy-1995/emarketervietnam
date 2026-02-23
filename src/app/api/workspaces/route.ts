import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const memberships = await platformDb.membership.findMany({
        where: { userId: authResult.user.userId },
        include: {
            workspace: true,
        },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
        workspaces: memberships.map((m) => ({
            id: m.workspace.id,
            name: m.workspace.name,
            slug: m.workspace.slug,
            product: m.workspace.product,
            status: m.workspace.status,
            role: m.role,
            createdAt: m.workspace.createdAt,
        })),
    });
}
