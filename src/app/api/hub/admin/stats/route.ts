import { NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/hub/admin/stats
 * 
 * Admin-only stats: users, workspaces, subscriptions, revenue, CRM instances.
 */
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const user = await db.user.findUnique({ where: { id: session.userId } });
    if (!user?.isAdmin) {
        return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
        totalUsers, totalWorkspaces,
        activeSubscriptions, trialSubscriptions,
        totalOrders, monthOrders,
        monthRevenue, lastMonthRevenue,
        crmInstances, deployingInstances,
        pendingNotifications, totalProducts,
    ] = await Promise.all([
        db.user.count(),
        db.workspace.count(),
        db.subscription.count({ where: { status: 'ACTIVE' } }),
        db.subscription.count({ where: { status: 'TRIAL' } }),
        db.commerceOrder.count(),
        db.commerceOrder.count({ where: { createdAt: { gte: monthStart } } }),
        db.commerceOrder.aggregate({ where: { createdAt: { gte: monthStart }, status: 'PAID' }, _sum: { totalAmount: true } }),
        db.commerceOrder.aggregate({ where: { createdAt: { gte: lastMonthStart, lt: monthStart }, status: 'PAID' }, _sum: { totalAmount: true } }),
        db.crmInstance.count(),
        db.crmInstance.count({ where: { status: 'DEPLOYING' } }),
        db.notificationQueue.count({ where: { status: 'PENDING' } }),
        db.product.count(),
    ]);

    const recentOrders = await db.commerceOrder.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, totalAmount: true, status: true, createdAt: true, userId: true },
    });

    const recentUsers = await db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, email: true, createdAt: true },
    });

    return NextResponse.json({
        overview: {
            totalUsers, totalWorkspaces,
            activeSubscriptions, trialSubscriptions,
            totalOrders, monthOrders,
            monthRevenue: monthRevenue._sum.totalAmount || 0,
            lastMonthRevenue: lastMonthRevenue._sum.totalAmount || 0,
            crmInstances, deployingInstances,
            pendingNotifications, totalProducts,
        },
        recentOrders: recentOrders.map((o: { id: string; totalAmount: number; status: string; createdAt: Date; userId: string }) => ({
            id: o.id, total: o.totalAmount, status: o.status, userId: o.userId,
            createdAt: o.createdAt.toISOString(),
        })),
        recentUsers: recentUsers.map((u: { id: string; name: string; email: string | null; createdAt: Date }) => ({
            ...u, createdAt: u.createdAt.toISOString(),
        })),
    });
}
