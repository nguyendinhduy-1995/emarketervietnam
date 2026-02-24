import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET — Revenue forecast + Cohort analysis + UTM ROI
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const type = req.nextUrl.searchParams.get('type') || 'forecast';

    if (type === 'forecast') return handleForecast();
    if (type === 'cohort') return handleCohort();
    if (type === 'roi') return handleROI();

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

// ═══════ Revenue Forecasting ═══════
async function handleForecast() {
    const accounts = await platformDb.emkAccount.findMany({
        where: { status: 'ACTIVE' },
        select: { plan: true, status: true, createdAt: true, workspace: { select: { product: true } } },
    });

    // Plan-based revenue projection
    const PLAN_REVENUE: Record<string, number> = {
        'TRIAL': 0, 'STARTER': 299000, 'PRO': 799000,
    };

    const pipeline = accounts.map(a => ({
        plan: a.plan,
        revenue: PLAN_REVENUE[a.plan] || 0,
        product: a.workspace?.product || 'OTHER',
    }));

    const totalPipeline = pipeline.reduce((s, p) => s + p.revenue, 0);

    // By plan breakdown
    const byPlan: Record<string, { count: number; revenue: number }> = {};
    for (const p of pipeline) {
        if (!byPlan[p.plan]) byPlan[p.plan] = { count: 0, revenue: 0 };
        byPlan[p.plan].count++;
        byPlan[p.plan].revenue += p.revenue;
    }

    // GPT forecast narrative
    let aiNarrative = '';
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'system',
                content: 'Viết 2-3 dòng phân tích dự báo doanh thu ngắn gọn, tiếng Việt. Dựa trên dữ liệu tài khoản đăng ký CRM.',
            }, {
                role: 'user',
                content: `Tài khoản: ${JSON.stringify(byPlan)}\nTổng doanh thu: ${totalPipeline.toLocaleString('vi-VN')}đ`,
            }],
            max_tokens: 150,
            temperature: 0.5,
        });
        aiNarrative = completion.choices[0]?.message?.content || '';
    } catch { aiNarrative = 'Không thể tạo phân tích AI'; }

    return NextResponse.json({
        type: 'forecast',
        totalPipeline,
        byStatus: byPlan,
        aiNarrative,
    });
}

// ═══════ Cohort Analysis ═══════
async function handleCohort() {
    const accounts = await platformDb.emkAccount.findMany({
        select: { plan: true, status: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    // Group by month
    const cohorts: Record<string, { total: number; paid: number; churned: number; active: number }> = {};

    for (const acct of accounts) {
        const d = new Date(acct.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!cohorts[key]) cohorts[key] = { total: 0, paid: 0, churned: 0, active: 0 };
        cohorts[key].total++;
        if (acct.plan !== 'TRIAL') cohorts[key].paid++;
        if (acct.status === 'INACTIVE' || acct.status === 'SUSPENDED') cohorts[key].churned++;
        if (acct.status === 'ACTIVE') cohorts[key].active++;
    }

    // Calculate rates
    const cohortData = Object.entries(cohorts).map(([month, data]) => ({
        month,
        ...data,
        conversionRate: data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0,
        churnRate: data.total > 0 ? Math.round((data.churned / data.total) * 100) : 0,
        retentionRate: data.total > 0 ? Math.round((data.active / data.total) * 100) : 0,
    }));

    return NextResponse.json({ type: 'cohort', cohorts: cohortData });
}

// ═══════ UTM/Channel ROI ═══════
async function handleROI() {
    // Use event logs to track source attribution
    const accounts = await platformDb.emkAccount.findMany({
        select: { plan: true, status: true, workspace: { select: { product: true } } },
    });

    const PLAN_REVENUE: Record<string, number> = {
        'TRIAL': 0, 'STARTER': 299000, 'PRO': 799000,
    };

    const byProduct: Record<string, { total: number; paid: number; revenue: number }> = {};
    for (const acct of accounts) {
        const product = acct.workspace?.product || 'OTHER';
        if (!byProduct[product]) byProduct[product] = { total: 0, paid: 0, revenue: 0 };
        byProduct[product].total++;
        if (acct.plan !== 'TRIAL') {
            byProduct[product].paid++;
            byProduct[product].revenue += PLAN_REVENUE[acct.plan] || 0;
        }
    }

    const roiData = Object.entries(byProduct).map(([product, data]) => ({
        source: product,
        ...data,
        conversionRate: data.total > 0 ? Math.round((data.paid / data.total) * 100) : 0,
    }));

    return NextResponse.json({ type: 'roi', channels: roiData });
}
