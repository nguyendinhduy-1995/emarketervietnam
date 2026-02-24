import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/partner/notifications — partner notifications
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await db.partnerProfile.findUnique({ where: { userId } });
    if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

    // Build notifications from recent events
    const recentEvents = await db.eventLog.findMany({
        where: { partnerId: partner.id },
        orderBy: { createdAt: 'desc' },
        take: 30,
    });

    const notifications = recentEvents.map((e) => {
        const payload = (e.payload || {}) as Record<string, unknown>;
        let title = '';
        let body = '';
        let icon = '🔔';
        let type: 'order' | 'commission' | 'payout' | 'system' = 'system';

        switch (e.type) {
            case 'PURCHASE':
                title = 'Đơn hàng mới!';
                body = `Khách hàng đã đặt đơn ${(payload.total as number) ? new Intl.NumberFormat('vi-VN').format(payload.total as number) + '₫' : ''}`;
                icon = '🛒';
                type = 'order';
                break;
            case 'COMMISSION_PENDING':
                title = 'Hoa hồng mới';
                body = `Bạn nhận được ${payload.amount ? new Intl.NumberFormat('vi-VN').format(payload.amount as number) + '₫' : ''} hoa hồng (đang giữ)`;
                icon = '💰';
                type = 'commission';
                break;
            case 'COMMISSION_AVAILABLE':
                title = 'Hoa hồng sẵn sàng!';
                body = `${payload.amount ? new Intl.NumberFormat('vi-VN').format(payload.amount as number) + '₫' : ''} đã được giải phóng vào ví`;
                icon = '✅';
                type = 'commission';
                break;
            case 'COMMISSION_REVERSED':
                title = 'Hoa hồng bị hoàn';
                body = `${payload.amount ? new Intl.NumberFormat('vi-VN').format(payload.amount as number) + '₫' : ''} bị hoàn do ${(payload.reason as string) || 'hoàn trả'}`;
                icon = '🔴';
                type = 'commission';
                break;
            case 'PAYOUT_REQUESTED':
                title = 'Yêu cầu rút tiền';
                body = `Yêu cầu rút ${payload.amount ? new Intl.NumberFormat('vi-VN').format(payload.amount as number) + '₫' : ''} đã được gửi`;
                icon = '💸';
                type = 'payout';
                break;
            case 'PAYOUT_PAID':
                title = 'Đã chuyển tiền!';
                body = `${payload.amount ? new Intl.NumberFormat('vi-VN').format(payload.amount as number) + '₫' : ''} đã được chuyển vào tài khoản`;
                icon = '🏦';
                type = 'payout';
                break;
            case 'REF_CLICK':
                title = 'Lượt click mới';
                body = `Link giới thiệu ${(payload.partnerCode as string) || ''} vừa được truy cập`;
                icon = '🔗';
                type = 'system';
                break;
            case 'PARTNER_APPROVED':
                if ((payload.action as string) === 'tier_upgrade') {
                    title = '🎉 Nâng cấp cấp bậc!';
                    body = `Bạn đã được nâng từ ${payload.from} lên ${payload.to}`;
                    icon = '🎖️';
                } else {
                    title = 'Tài khoản đã duyệt';
                    body = 'Tài khoản đối tác của bạn đã được kích hoạt';
                    icon = '✅';
                }
                type = 'system';
                break;
            default:
                title = e.type.replace(/_/g, ' ');
                body = JSON.stringify(payload).slice(0, 100);
        }

        return {
            id: e.id,
            title,
            body,
            icon,
            type,
            createdAt: e.createdAt,
        };
    });

    return NextResponse.json({ notifications });
}
