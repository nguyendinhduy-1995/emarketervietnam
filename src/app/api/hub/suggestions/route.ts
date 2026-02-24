import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// Solutions/Modules catalog
const SOLUTIONS = [
    { key: 'CRM', name: 'eMarketer CRM', desc: 'Quản lý khách hàng, leads & pipeline', icon: '📊', triggerEvents: ['CRM_VIEW', 'LEAD_CREATE', 'LEAD_UPDATE'], triggerPages: ['/emk-crm'], price: '299.000đ/tháng' },
    { key: 'ANALYTICS', name: 'Module Phân tích', desc: 'Báo cáo chi tiết & Insight AI', icon: '📈', triggerEvents: ['ANALYTICS_VIEW'], triggerPages: ['/emk-crm/analytics', '/emk-crm/reports'], price: '99.000đ/tháng' },
    { key: 'AFFILIATE', name: 'Module Đại lý', desc: 'Quản lý hoa hồng & đại lý', icon: '🤝', triggerEvents: ['AFFILIATE_VIEW'], triggerPages: ['/emk-crm/affiliates', '/emk-crm/payouts'], price: '149.000đ/tháng' },
    { key: 'CMS', name: 'Module Nội dung', desc: 'Blog, landing page & SEO', icon: '📝', triggerEvents: ['CMS_VIEW', 'CMS_CREATE'], triggerPages: ['/emk-crm/cms'], price: '79.000đ/tháng' },
    { key: 'AI_CHAT', name: 'AI Trợ lý thông minh', desc: 'Chatbot AI hỗ trợ tư vấn 24/7', icon: '🤖', triggerEvents: ['AI_CHAT'], triggerPages: ['/emk-crm/ai'], price: '199.000đ/tháng' },
    { key: 'EMAIL', name: 'Module Email', desc: 'Email marketing & automation', icon: '📧', triggerEvents: ['EMAIL_SEND'], triggerPages: ['/emk-crm/templates'], price: '129.000đ/tháng' },
];

export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        // Get recent user activity from EventLog (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const events = await platformDb.eventLog.findMany({
            where: {
                actorUserId: session.userId,
                createdAt: { gte: thirtyDaysAgo },
            },
            select: { type: true, payloadJson: true },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });

        // Score each solution based on user behavior
        const scores: Record<string, number> = {};

        for (const sol of SOLUTIONS) {
            let score = 0;

            // Check event type matches
            for (const event of events) {
                if (sol.triggerEvents.some(te => event.type?.includes(te))) {
                    score += 2;
                }
                // Check page visit patterns in payloadJson
                const meta = event.payloadJson as Record<string, unknown> | null;
                if (meta?.page && typeof meta.page === 'string') {
                    if (sol.triggerPages.some(tp => (meta.page as string).startsWith(tp))) {
                        score += 1;
                    }
                }
            }

            scores[sol.key] = score;
        }

        // Sort by score descending, pick top 2 with score > 0
        const suggestions = SOLUTIONS
            .map(sol => ({ ...sol, score: scores[sol.key] || 0 }))
            .filter(s => s.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 2)
            .map(s => ({
                key: s.key,
                name: s.name,
                desc: s.desc,
                icon: s.icon,
                price: s.price,
                reason: s.score >= 10 ? 'Bạn sử dụng tính năng này thường xuyên' :
                    s.score >= 5 ? 'Dựa trên hoạt động gần đây của bạn' :
                        'Có thể hữu ích cho bạn',
            }));

        // If no behavior-based suggestions, return a default one
        if (suggestions.length === 0) {
            suggestions.push({
                key: 'CRM',
                name: 'eMarketer CRM',
                desc: 'Quản lý khách hàng, leads & pipeline',
                icon: '📊',
                price: '299.000đ/tháng',
                reason: 'Sản phẩm phổ biến nhất',
            });
        }

        return NextResponse.json({ suggestions });
    } catch {
        return NextResponse.json({ suggestions: [] });
    }
}
