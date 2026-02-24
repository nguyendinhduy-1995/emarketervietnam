import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/partner/analytics — partner performance analytics
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await db.partnerProfile.findUnique({ where: { userId } });
    if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get daily stats for last 30 days
    const referrals = await db.orderReferral.findMany({
        where: { partnerId: partner.id, order: { createdAt: { gte: thirtyDaysAgo } } },
        include: { order: { select: { total: true, status: true, createdAt: true } } },
    });

    // Click count (from event logs)
    const clicks = await db.eventLog.count({
        where: { type: 'REF_CLICK', partnerId: partner.id, createdAt: { gte: thirtyDaysAgo } },
    });

    // Build daily chart data
    const dailyMap = new Map<string, { revenue: number; orders: number; clicks: number }>();
    for (let d = 0; d < 30; d++) {
        const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
        const key = date.toISOString().slice(0, 10);
        dailyMap.set(key, { revenue: 0, orders: 0, clicks: 0 });
    }

    for (const r of referrals) {
        const key = r.order.createdAt.toISOString().slice(0, 10);
        const entry = dailyMap.get(key);
        if (entry) {
            entry.revenue += r.order.total;
            entry.orders += 1;
        }
    }

    // Click events by day
    const clickEvents = await db.eventLog.findMany({
        where: { type: 'REF_CLICK', partnerId: partner.id, createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
    });
    for (const c of clickEvents) {
        const key = c.createdAt.toISOString().slice(0, 10);
        const entry = dailyMap.get(key);
        if (entry) entry.clicks += 1;
    }

    const chartData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Conversion rate
    const totalOrders = referrals.length;
    const conversionRate = clicks > 0 ? ((totalOrders / clicks) * 100).toFixed(1) : '0';

    // Top products referred
    const productMap = new Map<string, { name: string; count: number; revenue: number }>();
    const orderIds = referrals.map((r) => r.order);

    // Commission tier info
    const commissions = await db.commission.findMany({
        where: { partnerId: partner.id },
        select: { amount: true, status: true },
    });

    const totalEarned = commissions.reduce((s, c) => s + (c.status !== 'REVERSED' ? c.amount : 0), 0);
    const avgCommission = totalOrders > 0 ? Math.round(totalEarned / totalOrders) : 0;

    return NextResponse.json({
        summary: {
            clicks30d: clicks,
            orders30d: totalOrders,
            revenue30d: referrals.reduce((s, r) => s + r.order.total, 0),
            conversionRate,
            totalEarned,
            avgCommission,
        },
        chartData,
        partnerLevel: partner.level,
    });
}
