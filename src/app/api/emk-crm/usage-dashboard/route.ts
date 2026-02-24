import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/usage-dashboard — Usage analytics for PAYG products
export async function GET(req: NextRequest) {
    const ctx = await requireCrmAuth(req);
    if (ctx instanceof NextResponse) return ctx;

    const wsId = ctx.workspaceId;
    const period = req.nextUrl.searchParams.get('period') || '30d';
    const productId = req.nextUrl.searchParams.get('productId');

    // Calculate date range
    const now = new Date();
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(now.getTime() - days * 86400000);

    // Usage events query
    const where: Record<string, unknown> = {
        createdAt: { gte: startDate },
    };
    if (productId) where.productId = productId;
    // Tenant scope: if workspace known, filter by users in that workspace
    if (wsId) {
        const wsMembers = await platformDb.membership.findMany({
            where: { workspaceId: wsId },
            select: { userId: true },
        });
        where.userId = { in: wsMembers.map(m => m.userId) };
    }

    const events = await platformDb.usageEvent.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 1000,
    });

    // Aggregate by day
    const dailyMap = new Map<string, { count: number; totalAmount: number }>();
    for (const e of events) {
        const day = e.createdAt.toISOString().slice(0, 10);
        const existing = dailyMap.get(day) || { count: 0, totalAmount: 0 };
        existing.count += e.quantity;
        existing.totalAmount += e.unitPrice * e.quantity;
        dailyMap.set(day, existing);
    }

    const daily = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Aggregate by product
    const productMap = new Map<string, { productId: string; count: number; totalAmount: number }>();
    for (const e of events) {
        const key = e.productId;
        const existing = productMap.get(key) || { productId: key, count: 0, totalAmount: 0 };
        existing.count += e.quantity;
        existing.totalAmount += e.unitPrice * e.quantity;
        productMap.set(key, existing);
    }

    // Aggregate by user
    const userMap = new Map<string, { userId: string; count: number; totalAmount: number }>();
    for (const e of events) {
        const key = e.userId;
        const existing = userMap.get(key) || { userId: key, count: 0, totalAmount: 0 };
        existing.count += e.quantity;
        existing.totalAmount += e.unitPrice * e.quantity;
        userMap.set(key, existing);
    }

    // Summary
    const totalEvents = events.length;
    const totalUnits = events.reduce((sum, e) => sum + e.quantity, 0);
    const totalRevenue = events.reduce((sum, e) => sum + (e.unitPrice * e.quantity), 0);

    return NextResponse.json({
        period,
        workspaceId: wsId,
        summary: { totalEvents, totalUnits, totalRevenue },
        daily,
        byProduct: Array.from(productMap.values()),
        byUser: Array.from(userMap.values()).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 20),
    });
}
