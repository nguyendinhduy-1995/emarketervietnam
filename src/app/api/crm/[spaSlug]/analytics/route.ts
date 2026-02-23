import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        // 1. Total Customers
        const totalCustomers = await spaDb.customer.count({
            where: { workspaceId: tenant.workspaceId }
        });

        // 2. Total Revenue (sum of all 'paid' amounts)
        const receiptsResponse = await spaDb.receipt.aggregate({
            _sum: { paid: true, total: true },
            where: { workspaceId: tenant.workspaceId }
        });
        const totalRevenue = receiptsResponse._sum.paid || 0;
        const potentialRevenue = receiptsResponse._sum.total || 0;

        // 3. Appointments Today
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const appointmentsToday = await spaDb.appointment.count({
            where: {
                workspaceId: tenant.workspaceId,
                startAt: { gte: startOfDay, lte: endOfDay }
            }
        });

        // 4. Recent Receipts
        const recentReceipts = await spaDb.receipt.findMany({
            where: { workspaceId: tenant.workspaceId },
            include: { customer: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return NextResponse.json({
            metrics: {
                totalCustomers,
                totalRevenue,
                potentialRevenue,
                appointmentsToday
            },
            recentReceipts
        });

    } catch (error) {
        console.error('[ANALYTICS_GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
