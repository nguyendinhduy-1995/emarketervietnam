import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// GET — user's notifications
export async function GET(req: NextRequest) {
    const { cookies } = req;
    const sessionToken = cookies.get('hub_session')?.value || cookies.get('emk_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let userId: string;
    try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1] || '', 'base64').toString());
        userId = payload.userId;
        if (!userId) throw new Error();
    } catch { return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 }); }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const notifs = await db.notificationQueue.findMany({
        where: { userId, ...(status ? { status } : {}) },
        orderBy: { createdAt: 'desc' }, take: 50,
    });

    const unread = await db.notificationQueue.count({ where: { userId, status: { not: 'READ' } } });

    return NextResponse.json({ notifications: notifs, unreadCount: unread });
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
    const { cookies } = req;
    const sessionToken = cookies.get('hub_session')?.value || cookies.get('emk_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let userId: string;
    try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1] || '', 'base64').toString());
        userId = payload.userId;
        if (!userId) throw new Error();
    } catch { return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 }); }

    const { id, markAllRead } = await req.json();

    if (markAllRead) {
        await db.notificationQueue.updateMany({
            where: { userId, status: { not: 'READ' } },
            data: { status: 'READ', readAt: new Date() },
        });
    } else if (id) {
        await db.notificationQueue.update({
            where: { id },
            data: { status: 'READ', readAt: new Date() },
        });
    }

    return NextResponse.json({ ok: true });
}
