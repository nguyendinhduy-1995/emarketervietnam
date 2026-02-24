import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/partner/orders — orders attributed to partner
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const partner = await db.partnerProfile.findFirst({
        where: { userId },
    });
    if (!partner) {
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const referrals = await db.orderReferral.findMany({
        where: { partnerId: partner.id },
        include: {
            order: {
                select: {
                    code: true,
                    total: true,
                    status: true,
                    createdAt: true,
                    user: { select: { name: true } },
                },
            },
        },
        orderBy: { order: { createdAt: 'desc' } },
        take: 50,
    });

    const commissions = await db.commission.findMany({
        where: { partnerId: partner.id },
        select: { orderId: true, amount: true, status: true },
    });

    const orders = referrals.map((r) => {
        const comm = commissions.find((c) => c.orderId === r.orderId);
        return {
            code: r.order.code,
            customer: r.order.user.name || 'Khách',
            total: r.order.total,
            commission: comm?.amount || 0,
            commissionStatus: comm?.status || 'PENDING',
            orderStatus: r.order.status,
            attributionType: r.attributionType,
            date: r.order.createdAt,
        };
    });

    return NextResponse.json({ orders, total: orders.length });
}
