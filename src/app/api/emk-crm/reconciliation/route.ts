import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';

// GET — reconciliation report
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const format = searchParams.get('format'); // json | csv

    const dateFilter = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to) } : {}),
    };
    const hasDateFilter = from || to;

    // Aggregate topups
    const topups = await db.walletLedger.aggregate({
        where: { direction: 'CREDIT', type: 'TOPUP', ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true }, _count: true,
    });

    // Aggregate debits (spend)
    const debits = await db.walletLedger.aggregate({
        where: { direction: 'DEBIT', ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true }, _count: true,
    });

    // Aggregate refunds
    const refunds = await db.walletLedger.aggregate({
        where: { type: 'REFUND', ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        _sum: { amount: true }, _count: true,
    });

    // Orders by status
    const orders = await db.commerceOrder.groupBy({
        by: ['status'],
        _sum: { totalAmount: true }, _count: true,
        ...(hasDateFilter ? { where: { createdAt: dateFilter } } : {}),
    });

    // Usage events count
    const usage = await db.usageEvent.aggregate({
        where: { status: 'SUCCEEDED', ...(hasDateFilter ? { createdAt: dateFilter } : {}) },
        _sum: { total: true }, _count: true,
    });

    // Active subscriptions
    const activeSubs = await db.subscription.count({ where: { status: 'ACTIVE' } });
    const trialSubs = await db.subscription.count({ where: { status: 'TRIAL' } });

    const report = {
        period: { from: from || 'all', to: to || 'now' },
        topups: { total: topups._sum.amount || 0, count: topups._count },
        debits: { total: debits._sum.amount || 0, count: debits._count },
        refunds: { total: refunds._sum.amount || 0, count: refunds._count },
        net: (topups._sum.amount || 0) - (debits._sum.amount || 0) - (refunds._sum.amount || 0),
        orders: orders.map(o => ({ status: o.status, total: o._sum.totalAmount || 0, count: o._count })),
        usage: { total: usage._sum.total || 0, count: usage._count },
        subscriptions: { active: activeSubs, trial: trialSubs },
    };

    if (format === 'csv') {
        const csv = [
            'Metric,Amount VND,Count',
            `Topups,${report.topups.total},${report.topups.count}`,
            `Debits,${report.debits.total},${report.debits.count}`,
            `Refunds,${report.refunds.total},${report.refunds.count}`,
            `Net,${report.net},`,
            `Usage,${report.usage.total},${report.usage.count}`,
            `Active Subs,,${report.subscriptions.active}`,
            `Trial Subs,,${report.subscriptions.trial}`,
            ...report.orders.map(o => `Orders (${o.status}),${o.total},${o.count}`),
        ].join('\n');

        return new Response(csv, {
            headers: { 'Content-Type': 'text/csv', 'Content-Disposition': `attachment; filename=reconciliation-${from || 'all'}-to-${to || 'now'}.csv` },
        });
    }

    return NextResponse.json(report);
}
