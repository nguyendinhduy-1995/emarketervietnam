import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// ═══════ Types ═══════
interface MessageTemplate {
    id: string;
    name: string;
    channel: 'ZALO' | 'SMS' | 'EMAIL';
    content: string;
}

const TEMPLATES: MessageTemplate[] = [
    { id: 't1', name: 'Chào mừng khách mới', channel: 'ZALO', content: 'Xin chào {name}! Cảm ơn bạn đã quan tâm dịch vụ của chúng tôi. Liên hệ hotline 090xxx để được tư vấn miễn phí.' },
    { id: 't2', name: 'Nhắc hẹn demo', channel: 'ZALO', content: 'Chào {name}, bạn có lịch demo vào ngày mai lúc 10h. Bạn có thể tham gia chứ?' },
    { id: 't3', name: 'Ưu đãi tháng này', channel: 'SMS', content: '[eMarketer] {name}, uu dai dac biet giam 20% goi Premium thang nay. Goi 090xxx!' },
    { id: 't4', name: 'Follow-up sau demo', channel: 'ZALO', content: 'Chào {name}, cảm ơn bạn đã tham gia demo! Bạn có góp ý gì không? Mình sẵn sàng hỗ trợ.' },
    { id: 't5', name: 'Thông báo gia hạn', channel: 'SMS', content: '[eMarketer] {name}, goi dich vu cua ban sap het han. Gia han truoc 7 ngay de huong uu dai 10%.' },
    { id: 't6', name: 'Chúc mừng sinh nhật', channel: 'ZALO', content: 'Chúc mừng sinh nhật {name}! 🎂 eMarketer tặng bạn voucher giảm 15% cho lần gia hạn tiếp theo.' },
];

// ═══════ GET — List templates + message history ═══════
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const accountId = req.nextUrl.searchParams.get('leadId') || req.nextUrl.searchParams.get('accountId');

    // Get message history from EventLog
    let history: { id: string; type: string; channel: string; content: string; status: string; sentAt: Date }[] = [];
    if (accountId) {
        const logs = await platformDb.eventLog.findMany({
            where: { type: { startsWith: 'MSG_' }, payloadJson: { path: ['accountId'], equals: accountId } },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        history = logs.map((l: { id: string; type: string; payloadJson: unknown; createdAt: Date }) => {
            const p = l.payloadJson as Record<string, string> || {};
            return { id: l.id, type: l.type, channel: p.channel || 'ZALO', content: p.content || '', status: p.status || 'SENT', sentAt: l.createdAt };
        });
    }

    return NextResponse.json({ templates: TEMPLATES, history });
}

// ═══════ POST — Send message (log-based, actual integration TBD) ═══════
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { leadId: accountId2, channel, content, templateId } = await req.json();

    if (!accountId2 || !channel) {
        return NextResponse.json({ error: 'accountId and channel required' }, { status: 400 });
    }

    // Get account info
    const account = await platformDb.emkAccount.findUnique({
        where: { id: accountId2 },
        include: { workspace: { select: { name: true } } },
    });
    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    const acctName = account.workspace?.name || 'N/A';

    // Resolve content
    let messageContent = content;
    if (templateId && !content) {
        const tpl = TEMPLATES.find(t => t.id === templateId);
        if (tpl) messageContent = tpl.content;
    }
    messageContent = (messageContent || '').replace(/{name}/g, acctName);

    // Log the message
    const status = 'SENT';
    await platformDb.eventLog.create({
        data: {
            actorUserId: auth.user.userId,
            type: `MSG_${channel}`,
            payloadJson: { accountId: accountId2, channel, content: messageContent, templateId: templateId || null, status, recipient: acctName },
        },
    });

    return NextResponse.json({
        message: 'Message sent',
        status,
        channel,
        recipient: acctName,
        sentAt: new Date().toISOString(),
    });
}
