import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `Bạn là trợ lý AI của eMarketer Hub – nền tảng CRM & quản lý doanh nghiệp ngành dịch vụ (Spa, Salon, v.v.).

Vai trò của bạn:
- Hướng dẫn người dùng sử dụng Hub (workspace, marketplace, billing, tasks)
- Hỗ trợ team CRM nội bộ quản lý tài khoản, người dùng, pipeline
- Tư vấn chiến lược kinh doanh, marketing cho Spa/Salon
- Gợi ý cách tối ưu quy trình chăm sóc người dùng
- Viết email, tin nhắn, script gọi điện khi được yêu cầu
- QUAN TRỌNG: Bạn có thể truy vấn dữ liệu CRM thực qua function calling

Nguyên tắc:
- Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, thân thiện
- Sử dụng emoji hợp lý để dễ đọc
- TUYỆT ĐỐI KHÔNG dùng ký tự * hay dấu sao, KHÔNG in đậm, KHÔNG markdown hay HTML formatting
- Chỉ viết text thuần, không format gì cả
- Khi không chắc chắn, hỏi lại thay vì đoán
- Không tiết lộ thông tin kỹ thuật nội bộ (API keys, database, v.v.)
- Khi cần số liệu CRM, hãy gọi function để lấy dữ liệu thật`;

// CRM Tool definitions for function calling
const CRM_TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_account_stats',
            description: 'Lấy thống kê tổng quan tài khoản: tổng số, phân bổ theo plan, status, đăng ký mới tuần/tháng',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'search_accounts',
            description: 'Tìm kiếm tài khoản theo điều kiện: plan, status, hoặc tên workspace.',
            parameters: {
                type: 'object',
                properties: {
                    plan: { type: 'string', description: 'Filter theo gói: TRIAL, STARTER, PRO' },
                    status: { type: 'string', description: 'Filter theo trạng thái: ACTIVE, INACTIVE, SUSPENDED' },
                    name: { type: 'string', description: 'Tìm theo tên workspace' },
                    limit: { type: 'number', description: 'Giới hạn số kết quả (mặc định 10)' },
                },
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_task_stats',
            description: 'Lấy thống kê tasks: tổng số, open, overdue, done, phân bổ theo type',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_team_performance',
            description: 'Lấy hiệu suất team CRM: tasks completed, tasks assigned mỗi người',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
    {
        type: 'function',
        function: {
            name: 'get_revenue_data',
            description: 'Lấy dữ liệu doanh thu: tổng, theo tháng, theo gói sản phẩm',
            parameters: { type: 'object', properties: {}, required: [] },
        },
    },
];

// Function implementations
async function getAccountStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    const monthAgo = new Date(now.getTime() - 30 * 86400000);

    const [total, newWeek, newMonth, byPlan, byStatus] = await Promise.all([
        platformDb.emkAccount.count(),
        platformDb.emkAccount.count({ where: { createdAt: { gte: weekAgo } } }),
        platformDb.emkAccount.count({ where: { createdAt: { gte: monthAgo } } }),
        platformDb.emkAccount.groupBy({ by: ['plan'], _count: true }),
        platformDb.emkAccount.groupBy({ by: ['status'], _count: true }),
    ]);

    return {
        total, newWeek, newMonth,
        byPlan: byPlan.map(s => ({ plan: s.plan, count: s._count })),
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count })),
    };
}

async function searchAccounts(params: Record<string, unknown>) {
    const where: Record<string, unknown> = {};
    if (params.plan) where.plan = params.plan;
    if (params.status) where.status = params.status;
    if (params.name) where.workspace = { name: { contains: params.name as string, mode: 'insensitive' } };

    const accounts = await platformDb.emkAccount.findMany({
        where,
        select: {
            id: true, plan: true, status: true, createdAt: true, trialEndAt: true,
            workspace: { select: { name: true, slug: true, product: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min((params.limit as number) || 10, 20),
    });

    return accounts.map(a => ({
        name: a.workspace?.name || 'N/A',
        product: a.workspace?.product || 'N/A',
        plan: a.plan,
        status: a.status,
        trialEndAt: a.trialEndAt ? new Date(a.trialEndAt).toLocaleDateString('vi-VN') : null,
        createdAt: new Date(a.createdAt).toLocaleDateString('vi-VN'),
    }));
}

async function getTaskStats() {
    const now = new Date();
    const [total, open, done, cancelled, overdue, byType] = await Promise.all([
        platformDb.emkTask.count(),
        platformDb.emkTask.count({ where: { status: 'OPEN' } }),
        platformDb.emkTask.count({ where: { status: 'DONE' } }),
        platformDb.emkTask.count({ where: { status: 'CANCELLED' } }),
        platformDb.emkTask.count({ where: { status: 'OPEN', dueDate: { lt: now } } }),
        platformDb.emkTask.groupBy({ by: ['type'], _count: true }),
    ]);
    return { total, open, done, cancelled, overdue, byType: byType.map(t => ({ type: t.type, count: t._count })) };
}

async function getTeamPerformance() {
    const crmUsers = await platformDb.user.findMany({
        where: { emkRole: { not: null } },
        select: { id: true, name: true },
    });

    const results = await Promise.all(
        crmUsers.map(async (u) => {
            const tasksDone = await platformDb.emkTask.count({ where: { ownerId: u.id, status: 'DONE' } });
            const tasksTotal = await platformDb.emkTask.count({ where: { ownerId: u.id } });
            return { owner: u.name || 'Unknown', tasksDone, tasksTotal };
        })
    );
    return results;
}

async function getRevenueData() {
    try {
        const txns = await platformDb.paymentTxn.findMany({
            select: { amount: true, createdAt: true, description: true },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        const totalRevenue = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
        const thisMonth = txns.filter(t => {
            const d = new Date(t.createdAt);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
        const monthlyRevenue = thisMonth.reduce((sum, t) => sum + (t.amount || 0), 0);

        return { totalRevenue, monthlyRevenue, transactionCount: txns.length, thisMonthCount: thisMonth.length };
    } catch {
        return { totalRevenue: 0, monthlyRevenue: 0, transactionCount: 0, thisMonthCount: 0, note: 'Revenue data not available' };
    }
}

// Execute function call
async function executeFunction(name: string, args: string): Promise<string> {
    const params = JSON.parse(args || '{}');
    let result: unknown;

    switch (name) {
        case 'get_account_stats': result = await getAccountStats(); break;
        case 'search_accounts': result = await searchAccounts(params); break;
        case 'get_task_stats': result = await getTaskStats(); break;
        case 'get_team_performance': result = await getTeamPerformance(); break;
        case 'get_revenue_data': result = await getRevenueData(); break;
        default: result = { error: 'Unknown function' };
    }

    return JSON.stringify(result);
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { messages, context } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return Response.json({ error: 'Messages required' }, { status: 400 });
        }

        let systemPrompt = SYSTEM_PROMPT;
        if (context) {
            systemPrompt += `\n\nNgười dùng hiện tại: ${session.name} (${session.email})`;
            if (context.layer === 'hub') {
                systemPrompt += '\nĐang dùng: Hub (customer portal)';
            } else if (context.layer === 'crm') {
                systemPrompt += '\nĐang dùng: eMk-CRM (internal ops)';
                if (context.stats) {
                    systemPrompt += `\nThống kê hiện tại: ${JSON.stringify(context.stats)}`;
                }
            }
            if (context.currentPage) {
                systemPrompt += `\nTrang hiện tại: ${context.currentPage}`;
            }
        }

        const trimmedMessages = messages.slice(-10);

        // First call — with tools
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...trimmedMessages,
            ],
            tools: CRM_TOOLS,
            max_tokens: 1500,
            temperature: 0.7,
        });

        const choice = completion.choices[0];

        // Handle function calls
        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            const toolResults = await Promise.all(
                choice.message.tool_calls.map(async (tc) => {
                    const fn = tc as unknown as { id: string; function: { name: string; arguments: string } };
                    return {
                        tool_call_id: fn.id,
                        role: 'tool' as const,
                        content: await executeFunction(fn.function.name, fn.function.arguments),
                    };
                })
            );

            // Second call — with tool results, streaming
            const stream = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    ...trimmedMessages,
                    choice.message,
                    ...toolResults,
                ],
                stream: true,
                max_tokens: 1500,
                temperature: 0.7,
            });

            return createSSEResponse(stream);
        }

        // No function call — stream directly
        const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: systemPrompt },
                ...trimmedMessages,
            ],
            stream: true,
            max_tokens: 1000,
            temperature: 0.7,
        });

        return createSSEResponse(stream);

    } catch (error: unknown) {
        console.error('AI Chat error:', error);
        const message = error instanceof Error ? error.message : 'AI service error';
        return Response.json({ error: message }, { status: 500 });
    }
}

function createSSEResponse(stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
        async start(controller) {
            try {
                for await (const chunk of stream) {
                    const content = chunk.choices[0]?.delta?.content;
                    if (content) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
                    }
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            } catch {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`));
                controller.close();
            }
        },
    });

    return new Response(readable, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
    });
}
