import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

// GET — list orders
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (userId) where.userId = userId;

    const orders = await db.commerceOrder.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        take: 100,
    });
    return NextResponse.json(orders);
}
