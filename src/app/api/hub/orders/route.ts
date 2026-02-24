import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

// GET — user's orders + receipts
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    const orders = await db.commerceOrder.findMany({
        where: { userId },
        include: { items: true },
        orderBy: { createdAt: 'desc' }, take: 50,
    });

    const receipts = await db.receipt.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }, take: 50,
    });

    return NextResponse.json({ orders, receipts });
}
