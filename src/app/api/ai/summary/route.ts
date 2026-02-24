import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    try {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const prevWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

        // Gather CRM stats — based on accounts (registrations), not leads
        const [
            totalAccounts, trialAccounts, activeAccounts, paidAccounts,
            pendingTasks, overdueTasks,
            newSignupsWeek, newSignupsPrevWeek,
            tasksCompleted,
        ] = await Promise.all([
            platformDb.emkAccount.count(),
            platformDb.emkAccount.count({ where: { plan: 'TRIAL' } }),
            platformDb.emkAccount.count({ where: { status: 'ACTIVE' } }),
            platformDb.emkAccount.count({ where: { plan: { not: 'TRIAL' } } }),
            platformDb.emkTask.count({ where: { status: 'PENDING' } }),
            platformDb.emkTask.count({ where: { status: 'PENDING', dueDate: { lt: now } } }),
            platformDb.emkAccount.count({ where: { createdAt: { gte: weekAgo } } }),
            platformDb.emkAccount.count({ where: { createdAt: { gte: prevWeekStart, lt: weekAgo } } }),
            platformDb.emkTask.count({ where: { status: 'DONE', updatedAt: { gte: weekAgo } } }),
        ]);

        // Week-over-week change
        const signupChange = newSignupsWeek - newSignupsPrevWeek;
        const signupPct = newSignupsPrevWeek > 0 ? Math.round((signupChange / newSignupsPrevWeek) * 100) : 0;

        // Anomalies
        const anomalies: string[] = [];
        if (signupChange < 0) anomalies.push(`Đăng ký giảm ${Math.abs(signupPct)}% so với tuần trước`);
        if (overdueTasks > 0) anomalies.push(`${overdueTasks} tasks quá hạn`);

        const statsText = `
Thống kê eMarketer hiện tại:
- Tổng tài khoản: ${totalAccounts} (${trialAccounts} dùng thử, ${paidAccounts} trả phí, ${activeAccounts} đang hoạt động)
- Đăng ký mới tuần này: ${newSignupsWeek} (tuần trước: ${newSignupsPrevWeek}, ${signupChange >= 0 ? '+' : ''}${signupPct}%)
- Công việc: ${pendingTasks} đang chờ (${overdueTasks} quá hạn), ${tasksCompleted} hoàn thành tuần này
Hôm nay: ${now.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'system',
                    content: `Bạn là AI phân tích CRM cho eMarketer. Tóm tắt ngắn gọn tình hình đăng ký và kinh doanh dựa trên dữ liệu.
Quy tắc bắt buộc:
- Viết bằng tiếng Việt tự nhiên, thân thiện, dùng emoji hợp lý
- TUYỆT ĐỐI KHÔNG dùng ký tự * hay dấu sao, KHÔNG in đậm, KHÔNG dùng markdown hay HTML
- Chỉ viết text thuần, không format gì cả
- So sánh tuần này với tuần trước
- Nếu có rủi ro hoặc bất thường, cảnh báo rõ ràng
- Đề xuất 2 đến 3 hành động cụ thể
- Giới hạn 4 đến 5 dòng, viết tự nhiên như đang nói chuyện`,
                },
                { role: 'user', content: statsText },
            ],
            max_tokens: 400,
            temperature: 0.7,
        });

        const summary = completion.choices[0]?.message?.content || 'Không thể tạo tóm tắt.';

        return Response.json({
            summary,
            stats: {
                totalAccounts, trialAccounts, activeAccounts, paidAccounts,
                pendingTasks, overdueTasks,
                newSignupsWeek, newSignupsPrevWeek,
                signupChange, signupPct,
                tasksCompleted,
            },
            anomalies,
            generatedAt: now.toISOString(),
        });
    } catch (error: unknown) {
        console.error('AI Summary error:', error);
        return Response.json({ error: 'Không thể tạo tóm tắt' }, { status: 500 });
    }
}
