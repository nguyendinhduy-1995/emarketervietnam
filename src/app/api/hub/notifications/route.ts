import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const wsId = req.cookies.get('workspaceId')?.value;
    const notifications: Array<{
        id: string;
        type: string;
        icon: string;
        title: string;
        desc: string;
        time: Date;
        read: boolean;
    }> = [];

    // 1. Nhắc nhở subscription sắp hết hạn
    if (wsId) {
        const reminders = await platformDb.reminderLog.findMany({
            where: { workspaceId: wsId, status: 'PENDING' },
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: { subscription: { select: { id: true, status: true } } },
        });
        for (const r of reminders) {
            notifications.push({
                id: `reminder-${r.id}`,
                type: 'reminder',
                icon: '🔔',
                title: r.offsetDay < 0
                    ? `Gói dịch vụ sẽ hết hạn trong ${Math.abs(r.offsetDay)} ngày`
                    : `Gói dịch vụ đã quá hạn ${r.offsetDay} ngày`,
                desc: `Kênh: ${r.channel}`,
                time: r.createdAt,
                read: r.status === 'SENT',
            });
        }
    }

    // 2. Công việc quá hạn
    const overdueTasks = await platformDb.emkTask.findMany({
        where: {
            ownerId: session.userId,
            status: 'OPEN',
            dueDate: { lt: new Date() },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
    });
    for (const t of overdueTasks) {
        const daysOverdue = Math.ceil(
            (Date.now() - (t.dueDate?.getTime() || Date.now())) / (1000 * 60 * 60 * 24)
        );
        notifications.push({
            id: `task-${t.id}`,
            type: 'task',
            icon: '⚠️',
            title: `Công việc quá hạn: ${t.title}`,
            desc: `Quá hạn ${daysOverdue} ngày`,
            time: t.dueDate || t.createdAt,
            read: false,
        });
    }

    // 3. Hoạt động gần đây (EventLog)
    const recentEvents = await platformDb.eventLog.findMany({
        where: wsId ? { workspaceId: wsId } : {},
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { actor: { select: { name: true } } },
    });
    for (const e of recentEvents) {
        notifications.push({
            id: `event-${e.id}`,
            type: 'event',
            icon: '📋',
            title: formatEventType(e.type),
            desc: e.actor?.name || 'Hệ thống',
            time: e.createdAt,
            read: true,
        });
    }

    // Sắp xếp theo thời gian
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const unreadCount = notifications.filter(n => !n.read).length;

    return NextResponse.json({
        notifications: notifications.slice(0, 15),
        unreadCount,
    });
}

function formatEventType(type: string): string {
    const MAP: Record<string, string> = {
        'login': 'Đăng nhập hệ thống',
        'signup': 'Đăng ký tài khoản',
        'create_task': 'Tạo công việc mới',
        'import': 'Nhập dữ liệu',
        'payment': 'Thanh toán',
        'subscription_created': 'Đăng ký gói dịch vụ',
        'workspace_created': 'Tạo không gian làm việc',
    };
    return MAP[type] || type.replace(/_/g, ' ');
}
