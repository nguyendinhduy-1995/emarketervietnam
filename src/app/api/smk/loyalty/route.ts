import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// Points configuration
const POINTS_PER_VND = 0.001; // 1 point per 1000 VND spent
const VND_PER_POINT = 100; // 1 point = 100 VND discount
const LEVEL_THRESHOLDS = [
    { name: 'Đồng', minPoints: 0, multiplier: 1, icon: '🥉' },
    { name: 'Bạc', minPoints: 500, multiplier: 1.2, icon: '🥈' },
    { name: 'Vàng', minPoints: 2000, multiplier: 1.5, icon: '🥇' },
    { name: 'Kim Cương', minPoints: 5000, multiplier: 2, icon: '💎' },
];

function getMemberLevel(totalPoints: number) {
    let level = LEVEL_THRESHOLDS[0];
    for (const l of LEVEL_THRESHOLDS) {
        if (totalPoints >= l.minPoints) level = l;
    }
    const nextLevel = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.indexOf(level) + 1] || null;
    return { ...level, nextLevel };
}

// GET /api/loyalty — get user's loyalty status & points
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Calculate points from completed orders
    const deliveredOrders = await db.order.findMany({
        where: { userId, status: 'DELIVERED' },
        select: { id: true, total: true, createdAt: true, code: true },
        orderBy: { createdAt: 'desc' },
    });

    const totalSpent = deliveredOrders.reduce((sum, o) => sum + o.total, 0);
    // L6: Calculate earned points WITH multiplier (consistent with activity display)
    const basePoints = Math.round(totalSpent * POINTS_PER_VND);
    const level = getMemberLevel(basePoints);
    const earnedPoints = Math.round(totalSpent * POINTS_PER_VND * level.multiplier);

    // Calculate redeemed points (from orders with discountTotal > 0 and loyalty note)
    const redeemedOrders = await db.order.findMany({
        where: { userId, note: { contains: '[LOYALTY]' } },
        select: { discountTotal: true },
    });
    const redeemedPoints = redeemedOrders.reduce((sum, o) => sum + Math.round(o.discountTotal / VND_PER_POINT), 0);

    // L7: Clamp to min 0
    const currentPoints = Math.max(0, earnedPoints - redeemedPoints);

    // Recent point activity
    const recentActivity = deliveredOrders.slice(0, 10).map((o) => ({
        type: 'earn' as const,
        points: Math.round(o.total * POINTS_PER_VND * level.multiplier),
        description: `Đơn hàng ${o.code}`,
        date: o.createdAt,
    }));

    return NextResponse.json({
        points: {
            current: currentPoints,
            total: earnedPoints,
            redeemed: redeemedPoints,
            value: formatVND(currentPoints * VND_PER_POINT),
        },
        level: {
            name: level.name,
            icon: level.icon,
            multiplier: level.multiplier,
            nextLevel: level.nextLevel ? {
                name: level.nextLevel.name,
                icon: level.nextLevel.icon,
                pointsNeeded: level.nextLevel.minPoints - earnedPoints,
                progress: Math.min(100, Math.round((earnedPoints / level.nextLevel.minPoints) * 100)),
            } : null,
        },
        config: {
            pointsPerVND: POINTS_PER_VND,
            vndPerPoint: VND_PER_POINT,
            levels: LEVEL_THRESHOLDS,
        },
        recentActivity,
        stats: {
            totalOrders: deliveredOrders.length,
            totalSpent,
        },
    });
}

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}
