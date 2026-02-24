import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/accounts/[id] – Account detail with workspace, billing, modules
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const account = await platformDb.emkAccount.findUnique({
        where: { id },
        include: {
            workspace: {
                include: {
                    memberships: { include: { user: { select: { id: true, name: true, email: true } } } },
                    entitlements: { where: { status: 'ACTIVE' }, select: { moduleKey: true, activeFrom: true, activeTo: true } },
                    subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                    paymentTxns: { orderBy: { paidAt: 'desc' }, take: 10, select: { id: true, amount: true, description: true, paidAt: true, provider: true } },
                },
            },
            tasks: { orderBy: { createdAt: 'desc' }, take: 10, include: { owner: { select: { name: true } } } },
            notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
    });

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Calculate health score
    const now = new Date();
    let healthScore = 50;
    // Active status boost
    if (account.status === 'ACTIVE') healthScore += 20;
    else if (account.status === 'TRIAL') healthScore += 10;
    else if (account.status === 'CHURNED') healthScore -= 30;
    // Recent activity
    if (account.lastActivityAt) {
        const daysSinceActivity = Math.floor((now.getTime() - account.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity <= 1) healthScore += 20;
        else if (daysSinceActivity <= 7) healthScore += 10;
        else if (daysSinceActivity > 30) healthScore -= 20;
    }
    // Has payment history
    if ((account.workspace.paymentTxns?.length || 0) > 0) healthScore += 10;
    // Active modules
    healthScore += Math.min((account.workspace.entitlements?.length || 0) * 5, 15);
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Trial days remaining
    let trialDaysLeft: number | null = null;
    if (account.status === 'TRIAL' && account.trialEndAt) {
        trialDaysLeft = Math.max(0, Math.ceil((account.trialEndAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    }

    return NextResponse.json({
        ...account,
        healthScore,
        trialDaysLeft,
        memberCount: account.workspace.memberships?.length || 0,
    });
}

// PATCH /api/emk-crm/accounts/[id] – Update plan, status, trial extension
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const auth = await requireEmkRole(req, ['ADMIN', 'OPS']);
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const body = await req.json();

    const updateData: Record<string, unknown> = {};
    if (body.status) updateData.status = body.status;
    if (body.plan) updateData.plan = body.plan;
    if (body.extendTrialDays) {
        const account = await platformDb.emkAccount.findUnique({ where: { id }, select: { trialEndAt: true } });
        const baseDate = account?.trialEndAt || new Date();
        updateData.trialEndAt = new Date(baseDate.getTime() + body.extendTrialDays * 24 * 60 * 60 * 1000);
    }

    const updated = await platformDb.emkAccount.update({
        where: { id },
        data: updateData,
    });

    return NextResponse.json(updated);
}
