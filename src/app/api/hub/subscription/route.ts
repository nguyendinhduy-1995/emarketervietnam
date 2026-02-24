import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) {
        return NextResponse.json({ status: 'NONE', daysLeft: 0, planKey: null });
    }

    const subscription = await platformDb.subscription.findFirst({
        where: { workspaceId: wsId },
        orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
        return NextResponse.json({ status: 'NONE', daysLeft: 0, planKey: null });
    }

    let daysLeft = 0;
    if (subscription.currentPeriodEnd) {
        daysLeft = Math.max(0, Math.ceil(
            (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        ));
    }

    return NextResponse.json({
        status: subscription.status,
        daysLeft,
        planKey: subscription.planKey,
        periodEnd: subscription.currentPeriodEnd,
    });
}
