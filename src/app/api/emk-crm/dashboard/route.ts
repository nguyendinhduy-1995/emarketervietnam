import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET – CRM Dashboard Analytics: funnel, velocity, revenue, team
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Account Funnel (by plan + status)
    const planData = await platformDb.emkAccount.groupBy({
        by: ['plan'],
        _count: true,
    });
    const statusData = await platformDb.emkAccount.groupBy({
        by: ['status'],
        _count: true,
    });
    const funnelStages = ['TRIAL', 'STARTER', 'PRO'];
    const funnel = funnelStages.map(stage => ({
        stage,
        count: planData.find(f => f.plan === stage)?._count || 0,
    }));
    const totalAccounts = funnel.reduce((sum, f) => sum + f.count, 0);

    // 2. Signup Velocity (new accounts per week – last 4 weeks)
    const velocity: Array<{ week: string; count: number }> = [];
    for (let i = 3; i >= 0; i--) {
        const start = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const count = await platformDb.emkAccount.count({
            where: { createdAt: { gte: start, lt: end } },
        });
        velocity.push({ week: `T${4 - i}`, count });
    }

    // 3. Revenue by Plan
    const planPrices: Record<string, number> = {
        TRIAL: 0, STARTER: 299000, PRO: 799000,
    };
    const revenue = planData.map(p => ({
        plan: p.plan,
        count: p._count,
        revenue: p._count * (planPrices[p.plan] || 0),
    }));
    const totalRevenue = revenue.reduce((sum, r) => sum + r.revenue, 0);

    // 4. Team Performance (tasks per CRM user)
    const crmUsers = await platformDb.user.findMany({
        where: { emkRole: { not: null } },
        select: { id: true, name: true },
    });
    const teamPerf: Array<{ ownerId: string; name: string; accounts: number; tasks: number }> = [];
    for (const u of crmUsers) {
        const tasks = await platformDb.emkTask.count({ where: { ownerId: u.id } });
        teamPerf.push({ ownerId: u.id, name: u.name || 'Chưa rõ', accounts: 0, tasks });
    }

    // 5. Summary Stats
    const newSignupsWeek = await platformDb.emkAccount.count({ where: { createdAt: { gte: weekAgo } } });
    const newSignupsMonth = await platformDb.emkAccount.count({ where: { createdAt: { gte: monthAgo } } });
    const activeAccounts = statusData.find(s => s.status === 'ACTIVE')?._count || 0;
    const totalTasks = await platformDb.emkTask.count();
    const completedTasks = await platformDb.emkTask.count({ where: { status: 'DONE' } });

    // 6. Extra KPIs
    const paidAccounts = totalAccounts - (planData.find(p => p.plan === 'TRIAL')?._count || 0);
    const conversionRate = totalAccounts > 0 ? Math.round((paidAccounts / totalAccounts) * 100) : 0;
    const overdueTasks = await platformDb.emkTask.count({ where: { status: 'OPEN', dueDate: { lt: now } } });

    return NextResponse.json({
        funnel, totalAccounts, velocity, revenue, totalRevenue,
        teamPerformance: teamPerf,
        stats: {
            newSignupsWeek, newSignupsMonth, activeAccounts,
            totalTasks, completedTasks,
            taskRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            conversionRate,
            overdueTasks,
        },
    });
}
