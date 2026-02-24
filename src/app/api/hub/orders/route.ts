import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// GET — user's orders + receipts
export async function GET(req: Request) {
    const { cookies } = new URL(req.url) as unknown as { cookies: never };
    const sessionToken = req.headers.get('cookie')?.match(/hub_session=([^;]+)/)?.[1] || req.headers.get('cookie')?.match(/emk_session=([^;]+)/)?.[1];
    if (!sessionToken) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let userId: string;
    try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1] || '', 'base64').toString());
        userId = payload.userId;
        if (!userId) throw new Error();
    } catch { return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 }); }

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
