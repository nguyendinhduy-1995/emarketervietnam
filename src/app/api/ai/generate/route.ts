import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST – Tạo nội dung outreach bằng AI (GPT-powered)
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { leadId: accountId, type, tone, customPrompt } = body;
    // type: email | zalo | call_script
    // tone: formal | casual | friendly

    if (!accountId) {
        return NextResponse.json({ error: 'Thiếu ID tài khoản' }, { status: 400 });
    }

    const account = await platformDb.emkAccount.findUnique({
        where: { id: accountId },
        include: {
            workspace: { select: { name: true, product: true, slug: true } },
        },
    });

    if (!account) {
        return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
    }

    const toneMap: Record<string, string> = {
        formal: 'chuyên nghiệp, trang trọng, lịch sự',
        casual: 'thân thiện, nhẹ nhàng, thoải mái',
        friendly: 'gần gũi, nhiệt tình, ấm áp',
    };
    const toneDesc = toneMap[tone || 'friendly'] || 'thân thiện';

    const typeMap: Record<string, string> = {
        email: 'email marketing/outreach',
        zalo: 'tin nhắn Zalo ngắn gọn (dưới 500 ký tự)',
        call_script: 'kịch bản gọi điện chi tiết',
    };
    const contentType = typeMap[type || 'email'] || 'email';

    const industryLabel = account.workspace?.product === 'SPA' ? 'Spa & Thẩm mỹ'
        : account.workspace?.product === 'SALON' ? 'Salon/Tiệm tóc'
            : account.workspace?.product === 'CLINIC' ? 'Phòng khám'
                : account.workspace?.product === 'SALES' ? 'Kinh doanh/Bán hàng'
                    : account.workspace?.product || 'Doanh nghiệp';

    const acctAge = Math.ceil((Date.now() - new Date(account.createdAt).getTime()) / (1000 * 60 * 60 * 24));

    const planActions: Record<string, string> = {
        'TRIAL': 'Hỗ trợ sử dụng, highlight tính năng, mời nâng cấp',
        'STARTER': 'Chăm sóc, upsell gói PRO, chia sẻ tips nâng cao',
        'PRO': 'Black-belt support, survey hài lòng, loyalty program',
    };

    const systemPrompt = `Bạn là chuyên gia viết nội dung outreach cho eMarketer – nền tảng CRM thông minh cho ngành dịch vụ (Spa, Salon, Phòng khám).

Quy tắc bắt buộc:
- Viết bằng tiếng Việt tự nhiên, giọng ${toneDesc}
- TUYỆT ĐỐI KHÔNG dùng ký tự * hay dấu sao, KHÔNG in đậm, KHÔNG markdown hay HTML
- Chỉ viết text thuần, không format gì cả
- Cá nhân hóa tối đa dựa trên thông tin khách hàng
- Đưa ra lời kêu gọi hành động rõ ràng
- Không dùng placeholder như [tên], [công ty] — dùng thông tin thật
- Nếu viết email: có dòng tiêu đề ở dòng đầu
- Nếu viết Zalo: ngắn gọn, có emoji, dưới 500 ký tự
- Nếu viết kịch bản gọi điện: trình bày rõ ràng với các bước, gợi ý câu hỏi`;

    const userPrompt = `Viết ${contentType} cho tài khoản:

👤 Thông tin:
- Tên workspace: ${account.workspace?.name || 'N/A'}
- Ngành: ${industryLabel}
- Gói hiện tại: ${account.plan}
- Trạng thái: ${account.status}
- Tuổi tài khoản: ${acctAge} ngày

🎯 Mục tiêu: ${planActions[account.plan] || 'Giới thiệu dịch vụ'}
${customPrompt ? `\n📝 Yêu cầu thêm: ${customPrompt}` : ''}`;

    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            max_tokens: 1200,
            temperature: 0.8,
        });

        const content = completion.choices[0]?.message?.content || 'Không thể tạo nội dung.';

        return NextResponse.json({
            leadId: accountId, // backward compat
            type: type || 'email',
            tone: tone || 'friendly',
            content,
            lead: {
                name: account.workspace?.name || 'N/A',
                industry: account.workspace?.product,
                status: account.plan,
                source: null,
                age: acctAge,
            },
            model: 'gpt-4o-mini',
            generatedAt: new Date().toISOString(),
        });
    } catch (error: unknown) {
        console.error('AI Generate error:', error);

        const name = account.workspace?.name || 'Khách hàng';
        const fallbackContent = generateFallback(
            type || 'email', name, industryLabel,
            planActions[account.plan] || 'giới thiệu dịch vụ', toneDesc, account.plan
        );

        return NextResponse.json({
            leadId: accountId,
            type: type || 'email',
            tone: tone || 'friendly',
            content: fallbackContent,
            lead: { name, industry: account.workspace?.product, status: account.plan },
            model: 'fallback-template',
            generatedAt: new Date().toISOString(),
        });
    }
}

// Fallback template khi GPT không available
function generateFallback(type: string, name: string, industry: string, action: string, tone: string, plan: string): string {
    if (type === 'zalo') {
        return `Chào ${name} 👋 Mình từ eMarketer – nền tảng quản lý ${industry} thông minh. Mình muốn ${action}. Bạn rảnh không ạ? 😊`;
    }
    if (type === 'call_script') {
        return `📞 KỊCH BẢN GỌI ĐIỆN\n\n🎯 Mục tiêu: ${action}\n👤 Tài khoản: ${name}\n🏢 Ngành: ${industry}\n📊 Gói: ${plan}\n\n---\n\n1️⃣ MỞ ĐẦU:\n"Chào Anh/Chị, em là [tên] từ eMarketer. Em gọi để ${action}."\n\n2️⃣ TÌM HIỂU:\n- "Anh/Chị đang sử dụng eMarketer như thế nào?"\n- "Có gì cần hỗ trợ thêm không?"\n\n3️⃣ GIẢI PHÁP:\n- CRM thông minh cho ${industry}\n- Tự động nhắc lịch hẹn\n- Báo cáo real-time\n\n4️⃣ KẾT THÚC:\n☐ Hỗ trợ nâng cấp gói\n☐ Gửi tài liệu hướng dẫn`;
    }

    const greeting = tone.includes('trang trọng') ? `Kính gửi ${name},` : `Chào ${name},`;
    const closing = tone.includes('trang trọng') ? 'Trân trọng,\nĐội ngũ eMarketer' : 'Thân ái,\nĐội ngũ eMarketer ❤️';
    return `Subject: eMarketer – ${action}\n\n${greeting}\n\nChúng tôi muốn ${action}.\neMarketer giúp ${industry} quản lý khách hàng, lịch hẹn và doanh thu – tất cả trên một nền tảng.\n\nHãy cho chúng tôi biết thời gian phù hợp để trao đổi!\n\n${closing}`;
}
