import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

interface AutomationRule {
    id: string;
    name: string;
    enabled: boolean;
    trigger: {
        type: 'plan_is' | 'trial_expiring' | 'inactive' | 'new_signup';
        plan?: string;
        days?: number;
    };
    action: {
        type: 'create_task' | 'change_status';
        taskTitle?: string;
        taskType?: string;
        dueDays?: number;
        newStatus?: string;
    };
    lastRun?: string;
    matchCount: number;
}

// Default automation rules — account-based
const DEFAULT_RULES: AutomationRule[] = [
    {
        id: 'auto-1',
        name: 'Trial sắp hết hạn (< 3 ngày)',
        enabled: true,
        trigger: { type: 'trial_expiring', days: 3 },
        action: { type: 'create_task', taskTitle: '⚠️ Liên hệ tài khoản trial sắp hết', taskType: 'FOLLOW_UP', dueDays: 1 },
        matchCount: 0,
    },
    {
        id: 'auto-2',
        name: 'Đăng ký mới cần onboarding',
        enabled: true,
        trigger: { type: 'new_signup', days: 1 },
        action: { type: 'create_task', taskTitle: '📋 Onboarding tài khoản mới', taskType: 'GENERAL', dueDays: 1 },
        matchCount: 0,
    },
    {
        id: 'auto-3',
        name: 'Tài khoản Trial chưa nâng cấp > 10 ngày',
        enabled: true,
        trigger: { type: 'plan_is', plan: 'TRIAL', days: 10 },
        action: { type: 'create_task', taskTitle: '🚨 Tư vấn nâng cấp gói', taskType: 'CALL', dueDays: 1 },
        matchCount: 0,
    },
    {
        id: 'auto-4',
        name: 'Tài khoản inactive > 30 ngày',
        enabled: false,
        trigger: { type: 'inactive', days: 30 },
        action: { type: 'change_status', newStatus: 'INACTIVE' },
        matchCount: 0,
    },
];

// In-memory rules store
let rules: AutomationRule[] = [...DEFAULT_RULES];

// GET — list all rules
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ rules });
}

// POST — run automation rules or toggle
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();

    // Toggle rule
    if (body.action === 'toggle' && body.ruleId) {
        const rule = rules.find(r => r.id === body.ruleId);
        if (rule) {
            rule.enabled = !rule.enabled;
            return NextResponse.json({ rule });
        }
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Run all enabled rules
    if (body.action === 'run') {
        const now = new Date();
        const results: { ruleId: string; ruleName: string; matched: number; actions: string[] }[] = [];

        for (const rule of rules.filter(r => r.enabled)) {
            let matchedAccounts: { id: string; workspaceId: string; workspace: { name: string } }[] = [];

            switch (rule.trigger.type) {
                case 'trial_expiring': {
                    const expiryDate = new Date(now.getTime() + (rule.trigger.days || 3) * 86400000);
                    matchedAccounts = await platformDb.emkAccount.findMany({
                        where: {
                            plan: 'TRIAL',
                            trialEndAt: { lte: expiryDate, gte: now },
                        },
                        select: { id: true, workspaceId: true, workspace: { select: { name: true } } },
                        take: 20,
                    });
                    break;
                }
                case 'new_signup': {
                    const cutoff = new Date(now.getTime() - (rule.trigger.days || 1) * 86400000);
                    matchedAccounts = await platformDb.emkAccount.findMany({
                        where: { createdAt: { gte: cutoff } },
                        select: { id: true, workspaceId: true, workspace: { select: { name: true } } },
                        take: 20,
                    });
                    break;
                }
                case 'plan_is': {
                    const ageCutoff = new Date(now.getTime() - (rule.trigger.days || 10) * 86400000);
                    matchedAccounts = await platformDb.emkAccount.findMany({
                        where: {
                            plan: rule.trigger.plan || 'TRIAL',
                            createdAt: { lt: ageCutoff },
                        },
                        select: { id: true, workspaceId: true, workspace: { select: { name: true } } },
                        take: 20,
                    });
                    break;
                }
                case 'inactive': {
                    const inactiveCutoff = new Date(now.getTime() - (rule.trigger.days || 30) * 86400000);
                    matchedAccounts = await platformDb.emkAccount.findMany({
                        where: {
                            status: 'ACTIVE',
                            updatedAt: { lt: inactiveCutoff },
                        },
                        select: { id: true, workspaceId: true, workspace: { select: { name: true } } },
                        take: 20,
                    });
                    break;
                }
            }

            const actions: string[] = [];

            for (const acct of matchedAccounts) {
                if (rule.action.type === 'create_task') {
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + (rule.action.dueDays || 1));

                    const existing = await platformDb.emkTask.count({
                        where: {
                            relatedAccountId: acct.id,
                            title: { startsWith: rule.action.taskTitle?.slice(0, 10) || '' },
                            createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
                        },
                    });

                    if (existing === 0) {
                        await platformDb.emkTask.create({
                            data: {
                                title: `🤖 ${rule.action.taskTitle || 'Auto task'}`,
                                type: rule.action.taskType || 'GENERAL',
                                status: 'OPEN',
                                relatedAccountId: acct.id,
                                ownerId: auth.user.userId,
                                dueDate,
                            },
                        });
                        actions.push(`Tạo task cho ${acct.workspace?.name || acct.id}`);
                    }
                }

                if (rule.action.type === 'change_status' && rule.action.newStatus) {
                    await platformDb.emkAccount.update({
                        where: { id: acct.id },
                        data: { status: rule.action.newStatus },
                    });
                    actions.push(`Chuyển ${acct.workspace?.name || acct.id} → ${rule.action.newStatus}`);
                }
            }

            rule.matchCount = matchedAccounts.length;
            rule.lastRun = now.toISOString();

            results.push({
                ruleId: rule.id,
                ruleName: rule.name,
                matched: matchedAccounts.length,
                actions,
            });
        }

        return NextResponse.json({ results, runAt: now.toISOString() });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
