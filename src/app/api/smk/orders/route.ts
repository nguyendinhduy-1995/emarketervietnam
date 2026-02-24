import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/orders — user's orders
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get('limit')) || 10));
    const status = sp.get('status') || undefined;

    const where: Record<string, unknown> = { userId };
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
        db.order.findMany({
            where,
            include: {
                items: {
                    include: { variant: { select: { frameColor: true, lensColor: true } } },
                },
                statusHistory: { orderBy: { createdAt: 'desc' } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.order.count({ where }),
    ]);

    return NextResponse.json({ orders, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}
