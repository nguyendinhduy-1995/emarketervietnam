import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

const EVENT_LABELS: Record<string, string> = {
    WORKSPACE_CREATED: 'Đã tạo không gian làm việc',
    IMPORT_COMPLETED: 'Đã hoàn tất nhập dữ liệu',
    IMPORT_STARTED: 'Bắt đầu nhập dữ liệu',
    THEME_CHANGED: 'Đổi chế độ hiển thị',
    DEMO_SEEDED: 'Tạo dữ liệu mẫu',
    TASK_CREATED: 'Thêm việc cần làm',
    TASK_COMPLETED: 'Hoàn thành công việc',
    LOGIN: 'Đăng nhập',
    SIGNUP: 'Đăng ký tài khoản',
    USER_CREATED: 'Tạo tài khoản người dùng',
    ORDER_CREATED: 'Tạo đơn hàng mới',
    ORDER_PAID: 'Thanh toán đơn hàng',
    PAYMENT_CONFIRMED: 'Xác nhận thanh toán',
    MODULE_ENABLED: 'Kích hoạt module',
    MODULE_DISABLED: 'Tắt module',
    CUSTOMER_CREATED: 'Thêm khách hàng mới',
    APPOINTMENT_CREATED: 'Đặt lịch hẹn mới',
    RECEIPT_CREATED: 'Tạo phiếu thu mới',
};

function humanizeEvent(type: string, actorName?: string): string {
    const base = EVENT_LABELS[type] || type.replace(/_/g, ' ').toLowerCase();
    return actorName ? `${actorName} ${base.toLowerCase()}` : base;
}

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);

    const logs = await platformDb.eventLog.findMany({
        where: {
            ...(wsId ? { workspaceId: wsId } : { actorUserId: user.userId }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { actor: { select: { name: true } } },
    });

    // Group by day
    const grouped: Record<string, Array<{ id: string; message: string; time: string; type: string }>> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    for (const log of logs) {
        const date = new Date(log.createdAt);
        date.setHours(0, 0, 0, 0);
        let dayLabel: string;
        if (date.getTime() === today.getTime()) dayLabel = 'Hôm nay';
        else if (date.getTime() === yesterday.getTime()) dayLabel = 'Hôm qua';
        else dayLabel = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        if (!grouped[dayLabel]) grouped[dayLabel] = [];
        grouped[dayLabel].push({
            id: log.id,
            message: humanizeEvent(log.type, log.actor?.name),
            time: new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            type: log.type,
        });
    }

    return NextResponse.json({ timeline: grouped });
}
