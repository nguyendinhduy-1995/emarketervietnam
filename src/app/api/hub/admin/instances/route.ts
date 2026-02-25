import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

/**
 * GET /api/hub/admin/instances
 * 
 * List all CRM instances for admin dashboard.
 * Requires admin session.
 */
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: session.userId }, select: { isAdmin: true } });
    if (!user?.isAdmin) return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const instances = await db.crmInstance.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            workspace: {
                select: { name: true, org: { select: { name: true } } },
            },
        },
    });

    return NextResponse.json({
        instances: instances.map(i => ({
            ...i,
            _workspace: i.workspace,
        })),
    });
}
