import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/analytics/saas — SaaS metrics (MRR, churn, active subs)
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

    // Active subscriptions
    const activeSubs = await platformDb.subscription.count({ where: { status: 'ACTIVE' } });
    const trialSubs = await platformDb.subscription.count({ where: { status: 'TRIAL' } });
    const suspendedSubs = await platformDb.subscription.count({ where: { status: 'SUSPENDED' } });
    const totalSubs = await platformDb.subscription.count();

    // New subs last 30d vs previous 30d
    const newSubs30d = await platformDb.subscription.count({ where: { createdAt: { gte: thirtyDaysAgo } } });
    const newSubsPrev30d = await platformDb.subscription.count({ where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } } });

    // Canceled last 30d (churn)
    const canceled30d = await platformDb.subscription.count({
        where: { canceledAt: { gte: thirtyDaysAgo }, status: 'CANCELED' },
    });
    const churnRate = activeSubs > 0 ? ((canceled30d / activeSubs) * 100).toFixed(1) : '0';

    // MRR estimate (sum of active plan prices)
    const activeWithPlan = await platformDb.subscription.findMany({
        where: { status: 'ACTIVE', planId: { not: null } },
        select: { planId: true },
    });
    const planIds = [...new Set(activeWithPlan.map(s => s.planId).filter(Boolean))] as string[];
    let mrr = 0;
    if (planIds.length > 0) {
        const plans = await platformDb.plan.findMany({
            where: { id: { in: planIds } },
            select: { id: true, price: true },
        });
        const priceMap = new Map(plans.map(p => [p.id, (p as unknown as { price: number }).price || 0]));
        for (const sub of activeWithPlan) {
            if (sub.planId) mrr += priceMap.get(sub.planId) || 0;
        }
    }

    // Revenue last 30d (from ledger)
    const revenue30d = await platformDb.walletLedger.aggregate({
        where: { createdAt: { gte: thirtyDaysAgo }, type: 'DEBIT' },
        _sum: { amount: true },
    });

    // Tenant count
    const totalOrgs = await platformDb.org.count();
    const activeOrgs = await platformDb.org.count({ where: { status: 'ACTIVE' } });
    const totalWorkspaces = await platformDb.workspace.count();

    // Wallet balance total
    const walletTotal = await platformDb.wallet.aggregate({ _sum: { balanceAvailable: true } });

    // Recent entitlements
    const activeEntitlements = await platformDb.entitlement.count({ where: { status: 'ACTIVE' } });

    return NextResponse.json({
        subscriptions: {
            total: totalSubs, active: activeSubs, trial: trialSubs,
            suspended: suspendedSubs, newLast30d: newSubs30d, prevNewLast30d: newSubsPrev30d,
        },
        churn: { canceled30d, rate: parseFloat(churnRate) },
        mrr,
        revenue30d: Math.abs(revenue30d._sum.amount || 0),
        tenants: { orgs: totalOrgs, activeOrgs, workspaces: totalWorkspaces },
        walletBalance: walletTotal._sum.balanceAvailable || 0,
        entitlements: activeEntitlements,
    });
}
