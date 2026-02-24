import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/orders/:id — single order detail with timeline
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const order = await db.order.findFirst({
        where: { id, userId },
        include: {
            items: {
                include: {
                    variant: {
                        select: { frameColor: true, lensColor: true, sku: true },
                        include: { product: { select: { name: true, slug: true } } } as never,
                    },
                },
            },
            statusHistory: { orderBy: { createdAt: 'desc' } },
            coupon: { select: { code: true, type: true, value: true } },
            referral: { select: { attributionType: true, partner: { select: { partnerCode: true } } } },
        },
    });

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    return NextResponse.json({ order });
}
