import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import crypto from 'crypto';

/**
 * POST /api/hub/usage/record
 * 
 * Records PAYG usage for metered features (AI, messaging, etc.).
 * Called by CRM instances when a metered action occurs.
 * 
 * Body: { userId, orgId, productId, meteredItemKey, quantity?, metadata? }
 * Auth: Bearer ENTITLEMENT_SECRET
 */
export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    const secret = process.env.ENTITLEMENT_SECRET || process.env.CRON_SECRET;
    if (secret && auth !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId, orgId, productId, meteredItemKey, quantity, metadata } = await req.json();
    if (!userId || !productId || !meteredItemKey) {
        return NextResponse.json({ error: 'userId, productId, meteredItemKey required' }, { status: 400 });
    }

    const qty = quantity || 1;

    // Get metered item for pricing
    const meteredItem = await db.meteredItem.findFirst({
        where: { key: meteredItemKey, productId, isActive: true },
    });
    const unitPrice = meteredItem?.unitPrice || 0;
    const total = unitPrice * qty;

    // Check daily quota (hardcoded or from env)
    if (meteredItem) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayCount = await db.usageEvent.count({
            where: {
                userId,
                meteredItemKey,
                createdAt: { gte: today },
                status: 'SUCCEEDED',
            },
        });

        const maxPerDay = parseInt(process.env.USAGE_MAX_PER_DAY || '1000', 10);
        if (todayCount + qty > maxPerDay) {
            return NextResponse.json({
                error: `Đã đạt giới hạn ${maxPerDay} lượt/ngày`,
                code: 'DAILY_LIMIT', current: todayCount, limit: maxPerDay,
            }, { status: 429 });
        }
    }

    // Record usage event
    const requestId = `usage_${userId}_${meteredItemKey}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const event = await db.usageEvent.create({
        data: {
            userId,
            orgId: orgId || null,
            productId,
            meteredItemKey,
            quantity: qty,
            unitPrice,
            total,
            status: 'SUCCEEDED',
            requestId,
            metadata: metadata || undefined,
        },
    });

    // Debit wallet if PAYG has cost
    if (total > 0) {
        const wallet = await db.wallet.findUnique({ where: { userId } });
        if (wallet) {
            await db.wallet.update({
                where: { userId },
                data: { balanceAvailable: { decrement: total } },
            });
        }
    }

    return NextResponse.json({
        ok: true,
        usageId: event.id,
        meteredItemKey,
        quantity: qty,
        cost: total,
    });
}

/**
 * GET /api/hub/usage/record?userId=...&productId=...&period=month
 * 
 * Get usage summary for billing.
 */
export async function GET(req: NextRequest) {
    const userId = req.nextUrl.searchParams.get('userId');
    const productId = req.nextUrl.searchParams.get('productId');
    const period = req.nextUrl.searchParams.get('period') || 'month';

    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const now = new Date();
    const startDate = period === 'day'
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(now.getFullYear(), now.getMonth(), 1);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
        userId,
        createdAt: { gte: startDate },
        status: 'SUCCEEDED',
    };
    if (productId) where.productId = productId;

    const events = await db.usageEvent.groupBy({
        by: ['meteredItemKey'],
        where,
        _sum: { quantity: true, total: true },
        _count: true,
    });

    const totalCost = events.reduce((s, e) => s + (e._sum?.total || 0), 0);

    return NextResponse.json({
        userId, period,
        startDate: startDate.toISOString(),
        features: events.map(e => ({
            featureKey: e.meteredItemKey,
            count: e._count,
            totalQuantity: e._sum?.quantity || 0,
            totalCost: e._sum?.total || 0,
        })),
        totalCost,
    });
}
