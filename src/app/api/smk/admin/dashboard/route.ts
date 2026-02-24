import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/dashboard — overview stats
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
        todayRevenue,
        monthRevenue,
        lastMonthRevenue,
        todayOrders,
        monthOrders,
        newCustomers,
        abandonedCarts,
        pendingPartners,
        pendingPayouts,
        topProducts,
    ] = await Promise.all([
        db.order.aggregate({
            where: { createdAt: { gte: todayStart }, status: { notIn: ['CANCELLED', 'RETURNED'] } },
            _sum: { total: true },
        }),
        db.order.aggregate({
            where: { createdAt: { gte: monthStart }, status: { notIn: ['CANCELLED', 'RETURNED'] } },
            _sum: { total: true },
        }),
        db.order.aggregate({
            where: { createdAt: { gte: lastMonthStart, lt: monthStart }, status: { notIn: ['CANCELLED', 'RETURNED'] } },
            _sum: { total: true },
        }),
        db.order.count({ where: { createdAt: { gte: todayStart } } }),
        db.order.count({ where: { createdAt: { gte: monthStart } } }),
        db.user.count({ where: { createdAt: { gte: monthStart }, role: 'CUSTOMER' } }),
        db.cart.count({ where: { updatedAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
        db.partnerProfile.count({ where: { status: 'PENDING' } }),
        db.payoutRequest.count({ where: { status: 'REQUESTED' } }),
        db.orderItem.groupBy({
            by: ['nameSnapshot'],
            _sum: { qty: true },
            orderBy: { _sum: { qty: 'desc' } },
            take: 5,
        }),
    ]);

    const monthGrowth = lastMonthRevenue._sum.total
        ? Math.round(((monthRevenue._sum.total || 0) - lastMonthRevenue._sum.total) / lastMonthRevenue._sum.total * 100)
        : 0;

    return NextResponse.json({
        stats: {
            todayRevenue: todayRevenue._sum.total || 0,
            monthRevenue: monthRevenue._sum.total || 0,
            monthGrowth,
            todayOrders,
            monthOrders,
            newCustomers,
            abandonedCarts,
            pendingPartners,
            pendingPayouts,
        },
        topProducts: topProducts.map((p) => ({
            name: p.nameSnapshot,
            sold: p._sum.qty || 0,
        })),
    });
}
