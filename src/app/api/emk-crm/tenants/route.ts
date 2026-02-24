import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/tenants — List all tenant orgs + workspaces
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const orgs = await platformDb.org.findMany({
        include: {
            workspaces: {
                include: {
                    _count: { select: { memberships: true, subscriptions: true, entitlements: true } },
                },
            },
            owner: { select: { id: true, name: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(orgs);
}

// PATCH /api/emk-crm/tenants — Update org status (suspend/activate/cancel)
export async function PATCH(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const { orgId, status, reason } = await req.json();
    if (!orgId || !status) {
        return NextResponse.json({ error: 'orgId and status required' }, { status: 400 });
    }

    if (!['ACTIVE', 'SUSPENDED', 'CANCELED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const org = await platformDb.org.update({
        where: { id: orgId },
        data: { status },
    });

    // Log action
    await auth.audit({
        action: `TENANT_${status}`,
        resource: 'Org',
        resourceId: orgId,
        after: { status },
        reason: reason || `Tenant ${status.toLowerCase()}`,
    });

    // If suspended, suspend all workspace subscriptions
    if (status === 'SUSPENDED') {
        const workspaces = await platformDb.workspace.findMany({
            where: { orgId },
            select: { id: true },
        });
        for (const ws of workspaces) {
            await platformDb.subscription.updateMany({
                where: { workspaceId: ws.id, status: 'ACTIVE' },
                data: { status: 'SUSPENDED' },
            });
            await platformDb.workspace.update({
                where: { id: ws.id },
                data: { status: 'SUSPENDED' },
            });
        }
    }

    // If activated, reactivate workspaces
    if (status === 'ACTIVE') {
        const workspaces = await platformDb.workspace.findMany({
            where: { orgId },
            select: { id: true },
        });
        for (const ws of workspaces) {
            await platformDb.workspace.update({
                where: { id: ws.id },
                data: { status: 'ACTIVE' },
            });
        }
    }

    return NextResponse.json(org);
}
