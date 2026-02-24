import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

// GET — user's notifications
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    const notifs = await db.notificationQueue.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }, take: 50,
    });

    const unread = await db.notificationQueue.count({ where: { userId, status: { not: 'READ' } } });

    return NextResponse.json({ notifications: notifs, unreadCount: unread });
}

// PATCH — mark as read
export async function PATCH(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

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
