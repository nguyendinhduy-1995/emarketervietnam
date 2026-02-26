import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

const _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST – Chấm điểm tài khoản bằng AI (Rule-based + GPT)
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { leadId: accountId } = body; // backward compat: accept leadId as accountId

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

    // ═══════ RULE-BASED SCORING ═══════
    let ruleScore = 50;

    // 1. Plan (+0-25)
    const planPoints: Record<string, number> = { 'PRO': 25, 'STARTER': 15, 'TRIAL': 0 };
    const planScore = planPoints[account.plan] || 0;
    ruleScore += planScore;

    // 2. Status (+10-20)
    const statusPoints: Record<string, number> = { 'ACTIVE': 20, 'INACTIVE': -10, 'SUSPENDED': -20 };
    const statusScore = statusPoints[account.status] || 0;
    ruleScore += statusScore;

    // 3. Trial expiry proximity (for trial accounts)
    let trialScore = 0;
    if (account.plan === 'TRIAL' && account.trialEndAt) {
        const daysLeft = Math.ceil((new Date(account.trialEndAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 3) trialScore = -10; // about to expire
        else if (daysLeft <= 7) trialScore = 5;
        else trialScore = 10;
    }
    ruleScore += trialScore;

    // 4. Product/industry bonus
    const productPoints: Record<string, number> = { 'SPA': 10, 'SALON': 8, 'CLINIC': 12, 'SALES': 5 };
    const productScore = productPoints[account.workspace?.product || ''] || 0;
    ruleScore += productScore;

    // ═══════ FINAL SCORE ═══════
    const finalScore = Math.max(0, Math.min(100, ruleScore));

    let label: string;
    let color: string;
    let emoji: string;
    if (finalScore >= 75) { label = 'Tốt'; color = '#22c55e'; emoji = '🟢'; }
    else if (finalScore >= 50) { label = 'Trung bình'; color = '#f59e0b'; emoji = '🟡'; }
    else { label = 'Cần chú ý'; color = '#ef4444'; emoji = '🔴'; }

    let suggestion: string;
    if (finalScore >= 75) suggestion = 'Tài khoản hoạt động tốt. Có thể đề xuất nâng cấp gói.';
    else if (finalScore >= 50) suggestion = 'Gửi thông tin tính năng mới, hỗ trợ sử dụng thêm.';
    else suggestion = 'Cần chăm sóc: liên hệ tìm hiểu vấn đề, ưu đãi giữ chân.';

    return NextResponse.json({
        leadId: accountId, // backward compat
        score: finalScore,
        label, color, emoji, suggestion,
        breakdown: {
            base: 50,
            plan: planScore,
            status: statusScore,
            trial: trialScore,
            product: productScore,
            ruleTotal: ruleScore,
        },
        ai: { sentiment: 'neutral', boost: 0, assessment: '', hasAnalysis: false },
    });
}

// GET – Chấm điểm tất cả tài khoản (rule-based)
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const accounts = await platformDb.emkAccount.findMany({
        where: { status: { not: 'SUSPENDED' } },
        select: {
            id: true, plan: true, status: true, createdAt: true, trialEndAt: true,
            workspace: { select: { name: true, product: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    const scored = accounts.map(acct => {
        let score = 50;
        const planMap: Record<string, number> = { 'PRO': 25, 'STARTER': 15, 'TRIAL': 0 };
        score += planMap[acct.plan] || 0;
        const statusMap: Record<string, number> = { 'ACTIVE': 20, 'INACTIVE': -10 };
        score += statusMap[acct.status] || 0;
        const productMap: Record<string, number> = { 'SPA': 10, 'SALON': 8, 'CLINIC': 12, 'SALES': 5 };
        score += productMap[acct.workspace?.product || ''] || 0;
        score = Math.max(0, Math.min(100, score));

        let label: string; let color: string; let emoji: string;
        if (score >= 75) { label = 'Tốt'; color = '#22c55e'; emoji = '🟢'; }
        else if (score >= 50) { label = 'TB'; color = '#f59e0b'; emoji = '🟡'; }
        else { label = 'Chú ý'; color = '#ef4444'; emoji = '🔴'; }

        return {
            id: acct.id,
            name: acct.workspace?.name || 'N/A',
            phone: null, email: null,
            industry: acct.workspace?.product,
            source: null,
            status: acct.plan,
            createdAt: acct.createdAt,
            score, label, color, emoji,
        };
    });

    scored.sort((a, b) => b.score - a.score);

    return NextResponse.json({
        leads: scored, // backward compat key
        stats: {
            hot: scored.filter(l => l.score >= 75).length,
            warm: scored.filter(l => l.score >= 50 && l.score < 75).length,
            cold: scored.filter(l => l.score < 50).length,
        },
    });
}
