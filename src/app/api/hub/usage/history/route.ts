import { NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/hub/usage/history
 * 
 * Returns user's PAYG usage events and active quotas.
 */
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const userId = session.userId;
    const now = new Date();

    // Usage events (last 50)
    const events = await db.usageEvent.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    // Active quotas
    const quotas = await db.usageQuota.findMany({
        where: {
            userId,
            periodEnd: { gt: now },
        },
        orderBy: { periodEnd: 'desc' },
    });

    return NextResponse.json({
        events: events.map(e => ({
            id: e.id,
            productId: e.productId,
            meteredItemKey: e.meteredItemKey,
            quantity: e.quantity,
            unitPrice: e.unitPrice,
            total: e.total,
            status: e.status,
            createdAt: e.createdAt.toISOString(),
            metadata: e.metadata,
        })),
        quotas: quotas.map(q => ({
            itemKey: q.itemKey,
            quotaUsed: q.quotaUsed,
            quotaLimit: q.quotaLimit,
            periodEnd: q.periodEnd.toISOString(),
        })),
    });
}
