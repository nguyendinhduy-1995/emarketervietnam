import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/partner/dashboard — partner stats & recent data
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await db.partnerProfile.findUnique({ where: { userId } });
    if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Stats
    const [monthlyReferrals, commissions, wallet, recentOrders] = await Promise.all([
        // Monthly referred orders
        db.orderReferral.findMany({
            where: { partnerId: partner.id, order: { createdAt: { gte: monthStart } } },
            include: { order: { select: { total: true, status: true, code: true, createdAt: true } } },
        }),
        // Commissions summary
        db.commission.groupBy({
            by: ['status'],
            where: { partnerId: partner.id },
            _sum: { amount: true },
            _count: true,
        }),
        // Wallet balance
        db.partnerWalletTx.aggregate({
            where: { partnerId: partner.id },
            _sum: { amount: true },
        }),
        // Recent referred orders
        db.orderReferral.findMany({
            where: { partnerId: partner.id },
            include: {
                order: {
                    select: { code: true, total: true, status: true, createdAt: true },
                    include: { user: { select: { name: true } } } as never,
                },
            },
            orderBy: { order: { createdAt: 'desc' } },
            take: 10,
        }),
    ]);

    const revenue = monthlyReferrals.reduce((s, r) => s + r.order.total, 0);
    const orderCount = monthlyReferrals.length;

    const commissionsByStatus = Object.fromEntries(
        commissions.map((c) => [c.status, { sum: c._sum.amount || 0, count: c._count }])
    );

    return NextResponse.json({
        partner: {
            id: partner.id,
            partnerCode: partner.partnerCode,
            level: partner.level,
            status: partner.status,
        },
        stats: {
            monthlyRevenue: revenue,
            monthlyOrders: orderCount,
            pendingCommission: commissionsByStatus['PENDING']?.sum || 0,
            availableCommission: commissionsByStatus['AVAILABLE']?.sum || 0,
            paidCommission: commissionsByStatus['PAID']?.sum || 0,
            walletBalance: wallet._sum.amount || 0,
        },
        recentOrders: recentOrders.map((r) => ({
            code: r.order.code,
            total: r.order.total,
            status: r.order.status,
            createdAt: r.order.createdAt,
            attributionType: r.attributionType,
        })),
    });
}
