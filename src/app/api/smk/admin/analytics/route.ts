import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/analytics — advanced admin analytics
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const sp = req.nextUrl.searchParams;
    const period = sp.get('period') || '30'; // days
    const days = Math.min(365, Math.max(1, Number(period)));

    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Revenue breakdown by day
    const orders = await db.order.findMany({
        where: { createdAt: { gte: startDate }, status: { notIn: ['CANCELLED'] } },
        select: { total: true, subtotal: true, discountTotal: true, shippingFee: true, createdAt: true, status: true, paymentMethod: true },
    });

    const dailyRevenue = new Map<string, { revenue: number; orders: number; discount: number }>();
    for (let d = 0; d < days; d++) {
        const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        dailyRevenue.set(date, { revenue: 0, orders: 0, discount: 0 });
    }
    for (const o of orders) {
        const key = o.createdAt.toISOString().slice(0, 10);
        const entry = dailyRevenue.get(key);
        if (entry) {
            entry.revenue += o.total;
            entry.orders += 1;
            entry.discount += o.discountTotal;
        }
    }

    const revenueChart = Array.from(dailyRevenue.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // 2. Payment method breakdown
    const paymentBreakdown: Record<string, { count: number; total: number }> = {};
    for (const o of orders) {
        if (!paymentBreakdown[o.paymentMethod]) paymentBreakdown[o.paymentMethod] = { count: 0, total: 0 };
        paymentBreakdown[o.paymentMethod].count++;
        paymentBreakdown[o.paymentMethod].total += o.total;
    }

    // 3. Order status distribution
    const statusDist = await db.order.groupBy({
        by: ['status'],
        _count: true,
        _sum: { total: true },
    });

    // 4. Partner ranking (top 10 by revenue)
    const partnerReferrals = await db.orderReferral.findMany({
        where: { order: { createdAt: { gte: startDate }, status: { notIn: ['CANCELLED', 'RETURNED'] } } },
        include: {
            order: { select: { total: true } },
            partner: { select: { partnerCode: true, level: true, user: { select: { name: true } } } },
        },
    });

    const partnerMap = new Map<string, { code: string; name: string; level: string; revenue: number; orders: number }>();
    for (const r of partnerReferrals) {
        const key = r.partnerId;
        if (!partnerMap.has(key)) {
            partnerMap.set(key, {
                code: r.partner.partnerCode,
                name: r.partner.user.name || 'N/A',
                level: r.partner.level,
                revenue: 0,
                orders: 0,
            });
        }
        const entry = partnerMap.get(key)!;
        entry.revenue += r.order.total;
        entry.orders += 1;
    }

    const partnerRanking = Array.from(partnerMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

    // 5. Product performance
    const topItems = await db.orderItem.groupBy({
        by: ['variantId'],
        where: { order: { createdAt: { gte: startDate }, status: { notIn: ['CANCELLED'] } } },
        _sum: { qty: true, price: true },
        _count: true,
        orderBy: { _sum: { qty: 'desc' } },
        take: 10,
    });

    const topVariantIds = topItems.map((t: { variantId: string }) => t.variantId);
    const topVariants = await db.productVariant.findMany({
        where: { id: { in: topVariantIds } },
        include: { product: { select: { name: true, brand: true, slug: true } } },
    });

    const productPerformance = topItems.map((t: { variantId: string; _sum: { qty: number | null; price: number | null }; _count: number }) => {
        const v = topVariants.find((v: { id: string }) => v.id === t.variantId);
        return {
            name: v?.product.name || 'N/A',
            brand: v?.product.brand || 'N/A',
            slug: v?.product.slug || '',
            sold: t._sum.qty || 0,
            revenue: (t._sum.price || 0) * (t._sum.qty || 0),
            orders: t._count,
        };
    });

    // 6. Customer metrics
    const [totalCustomers, newCustomers, repeatCustomers] = await Promise.all([
        db.user.count({ where: { role: 'CUSTOMER' } }),
        db.user.count({ where: { role: 'CUSTOMER', createdAt: { gte: startDate } } }),
        db.order.groupBy({
            by: ['userId'],
            _count: true,
            having: { userId: { _count: { gt: 1 } } },
        }).then((r: unknown[]) => r.length),
    ]);

    // 7. Summary
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const totalDiscount = orders.reduce((s, o) => s + o.discountTotal, 0);
    const avgOrderValue = orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0;

    return NextResponse.json({
        summary: {
            totalRevenue,
            totalOrders: orders.length,
            totalDiscount,
            avgOrderValue,
            totalCustomers,
            newCustomers,
            repeatCustomers,
            repeatRate: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : '0',
        },
        revenueChart,
        paymentBreakdown,
        orderStatusDistribution: statusDist.map((s: { status: string; _count: number; _sum: { total: number | null } }) => ({
            status: s.status,
            count: s._count,
            total: s._sum.total || 0,
        })),
        partnerRanking,
        productPerformance,
        period: days,
    });
}
