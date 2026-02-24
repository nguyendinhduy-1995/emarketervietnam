import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';
import { NextResponse } from 'next/server';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// In-memory cache: refresh once per hour
let cachedInsights: { insights: string[]; generatedAt: string; stats: Record<string, number> } | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    // Return cache if fresh
    if (cachedInsights && Date.now() - cacheTime < CACHE_TTL) {
        return Response.json(cachedInsights);
    }

    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevWeek = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Gather comprehensive stats — based on accounts, not leads
        const [
            totalAccounts, newThisWeek, newLastWeek,
            byPlan, byStatus,
            activeTasks, overdueTasks, completedTasksWeek,
        ] = await Promise.all([
            platformDb.emkAccount.count(),
            platformDb.emkAccount.count({ where: { createdAt: { gte: weekAgo } } }),
            platformDb.emkAccount.count({ where: { createdAt: { gte: prevWeek, lt: weekAgo } } }),
            platformDb.emkAccount.groupBy({ by: ['plan'], _count: true }),
            platformDb.emkAccount.groupBy({ by: ['status'], _count: true }),
            platformDb.emkTask.count({ where: { status: 'OPEN' } }),
            platformDb.emkTask.count({ where: { status: 'OPEN', dueDate: { lt: now } } }),
            platformDb.emkTask.count({ where: { status: 'DONE', updatedAt: { gte: weekAgo } } }),
        ]);

        const signupChange = newThisWeek - newLastWeek;
        const signupChangePct = newLastWeek > 0 ? Math.round((signupChange / newLastWeek) * 100) : 0;

        const planMap = Object.fromEntries(byPlan.map(s => [s.plan, s._count]));
        const statusMap = Object.fromEntries(byStatus.map(s => [s.status, s._count]));

        const trialAccounts = planMap['TRIAL'] || 0;
        const paidAccounts = totalAccounts - trialAccounts;
        const conversionRate = totalAccounts > 0
            ? Math.round((paidAccounts / totalAccounts) * 100) : 0;

        const dataContext = `
CRM Data — ${now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}:
- Tổng tài khoản đăng ký: ${totalAccounts}
- Đăng ký tuần này: ${newThisWeek} (tuần trước: ${newLastWeek}, ${signupChange >= 0 ? '+' : ''}${signupChangePct}%)
- Phân bố gói: ${JSON.stringify(planMap)}
- Phân bố status: ${JSON.stringify(statusMap)}
- Tỷ lệ chuyển đổi Trial→Paid: ${conversionRate}%
- Tasks: ${activeTasks} open, ${overdueTasks} quá hạn, ${completedTasksWeek} done tuần này`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Bạn là AI CRM Analyst cho eMarketer. Phân tích dữ liệu đăng ký và tài khoản, đưa ra 4 đến 5 nhận định thực tế, cụ thể.

Quy tắc bắt buộc:
- Mỗi nhận định là 1 dòng ngắn gọn, bắt đầu bằng emoji
- TUYỆT ĐỐI KHÔNG dùng ký tự * hay dấu sao, KHÔNG in đậm, KHÔNG markdown hay HTML
- Chỉ viết text thuần, không format gì cả
- Ưu tiên nhận định kèm đề xuất hành động cụ thể
- Cảnh báo nếu có bất thường hoặc vấn đề
- Khen ngợi nếu có chỉ số tốt
- Viết tiếng Việt tự nhiên, chuyên nghiệp
- Trả về JSON array of strings: ["nhận định 1", "nhận định 2", ...]
- KHÔNG bọc trong code block, chỉ trả về raw JSON array`,
                },
                { role: 'user', content: dataContext },
            ],
            max_tokens: 500,
            temperature: 0.7,
        });

        let insights: string[] = [];
        const raw = completion.choices[0]?.message?.content || '[]';
        try {
            insights = JSON.parse(raw.replace(/```json\n?/g, '').replace(/```/g, '').trim());
        } catch {
            insights = raw.split('\n').filter(l => l.trim().length > 5);
        }

        const stats = {
            totalAccounts, newThisWeek, newLastWeek, signupChangePct,
            trialAccounts, paidAccounts,
            conversionRate, activeTasks, overdueTasks,
        };

        cachedInsights = { insights, generatedAt: now.toISOString(), stats };
        cacheTime = Date.now();

        return Response.json(cachedInsights);
    } catch (error: unknown) {
        console.error('AI Insights error:', error);

        // Fallback insights (no GPT)
        const fallback = [
            '📊 Đang thu thập dữ liệu phân tích...',
            '💡 Kiểm tra OPENAI_API_KEY nếu AI insights không hoạt động',
        ];
        return Response.json({ insights: fallback, generatedAt: new Date().toISOString(), stats: {} });
    }
}
