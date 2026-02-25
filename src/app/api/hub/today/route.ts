import { NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/hub/today
 * 
 * Hub Dashboard summary — workspaces, subscription status, alerts, KPI.
 * Uses platform DB only (no spa dependency).
 */
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const userId = session.userId;
    const now = new Date();

    // 1. Get user's workspaces
    const memberships = await db.membership.findMany({
        where: { userId },
        include: {
            workspace: { select: { id: true, name: true, slug: true, status: true, product: true } },
        },
        orderBy: { createdAt: 'asc' },
    });

    const workspaces = memberships.map(m => ({
        id: m.workspace.id,
        name: m.workspace.name,
        slug: m.workspace.slug,
        status: m.workspace.status,
        product: m.workspace.product,
        role: m.role,
    }));

    // 2. Subscription status
    const primaryWs = workspaces[0];
    let subscription = null;
    if (primaryWs) {
        const sub = await db.subscription.findFirst({
            where: { workspaceId: primaryWs.id },
            orderBy: { createdAt: 'desc' },
        });
        if (sub) {
            const daysLeft = sub.currentPeriodEnd
                ? Math.max(0, Math.ceil((sub.currentPeriodEnd.getTime() - now.getTime()) / 86400000))
                : 0;
            subscription = {
                status: sub.status,
                planKey: sub.planKey,
                daysLeft,
                periodEnd: sub.currentPeriodEnd?.toISOString(),
            };
        }
    }

    // 3. Wallet balance
    const wallet = await db.wallet.findUnique({ where: { userId } });
    const balance = wallet?.balanceAvailable ?? 0;

    // 4. Alerts
    const alerts: Array<{ id: string; type: 'danger' | 'warning' | 'info'; message: string }> = [];

    if (subscription?.status === 'PAST_DUE') {
        alerts.push({ id: 'sub_past_due', type: 'danger', message: 'Gói dịch vụ đang quá hạn. Nạp ví để gia hạn tự động.' });
    }
    if (subscription?.status === 'SUSPENDED') {
        alerts.push({ id: 'sub_suspended', type: 'danger', message: 'Dịch vụ đã bị tạm ngưng. Nạp ví và liên hệ hỗ trợ.' });
    }
    if (subscription && subscription.daysLeft <= 3 && subscription.daysLeft > 0 && subscription.status === 'ACTIVE') {
        alerts.push({ id: 'sub_expiring', type: 'warning', message: `Gói dịch vụ sẽ hết hạn trong ${subscription.daysLeft} ngày.` });
    }
    if (balance < 50000 && wallet) {
        alerts.push({ id: 'low_balance', type: 'warning', message: `Số dư ví thấp (${balance.toLocaleString()}đ). Nạp thêm để tránh gián đoạn.` });
    }

    // 5. Unread notifications count
    const unreadNotifs = await db.notificationQueue.count({
        where: { userId, status: 'PENDING' },
    });

    // 6. CRM instance status (if any)
    let crmInstance = null;
    if (primaryWs) {
        const instance = await db.crmInstance.findUnique({ where: { workspaceId: primaryWs.id } });
        if (instance) {
            crmInstance = {
                status: instance.status,
                domain: instance.domain,
                crmUrl: instance.crmUrl,
            };
        }
    }

    // 7. Onboarding check
    const hasCompletedOnboarding = workspaces.length > 0;

    // 8. KPI: simple this-month spend
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthSpend = await db.walletLedger.aggregate({
        where: { userId, direction: 'DEBIT', createdAt: { gte: monthStart } },
        _sum: { amount: true },
    });

    return NextResponse.json({
        alerts,
        workspaces,
        subscription,
        wallet: { balance, currency: wallet?.currency ?? 'VND' },
        kpi: {
            label: 'Chi tiêu tháng này',
            current: monthSpend._sum.amount || 0,
            target: 0,
            percent: 0,
        },
        unreadNotifications: unreadNotifs,
        crmInstance,
        hasCompletedOnboarding,
    });
}
