import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/products/instances — CRM subscriptions with workspace + user stats
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    // Get all subscriptions with workspace, org, owner, crmInstance
    const subscriptions = await platformDb.subscription.findMany({
        include: {
            workspace: {
                include: {
                    _count: { select: { memberships: true } },
                    org: {
                        include: {
                            owner: { select: { id: true, name: true, phone: true, email: true } },
                        },
                    },
                    crmInstance: { select: { domain: true, crmUrl: true, status: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Get all products for lookup
    const products = await platformDb.product.findMany({
        select: { id: true, name: true, type: true, icon: true, key: true },
    });
    const productMap = new Map(products.map(p => [p.id, p]));

    // Map to a clean response
    const instances = subscriptions.map(sub => {
        const product = sub.productId ? productMap.get(sub.productId) || null : null;
        const ws = sub.workspace;
        const crm = ws?.crmInstance;

        return {
            subscriptionId: sub.id,
            status: sub.status,
            plan: sub.planKey,
            startDate: sub.createdAt,
            endDate: sub.currentPeriodEnd || null,
            product,
            workspace: ws ? {
                id: ws.id,
                name: ws.name,
                slug: ws.slug,
                status: ws.status,
                createdAt: ws.createdAt,
                userCount: ws._count.memberships,
            } : null,
            crm: crm ? {
                domain: crm.domain,
                crmUrl: crm.crmUrl,
                status: crm.status,
            } : null,
            org: ws?.org ? {
                id: ws.org.id,
                name: ws.org.name,
                status: ws.org.status,
                owner: ws.org.owner,
            } : null,
        };
    });

    return NextResponse.json(instances);
}
