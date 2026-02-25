import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/usage/quote
 * 
 * App asks Hub for price before charging.
 * Body: { productId, itemKey, quantity }
 * Returns: { unitPrice, total, quotaRemaining, balance }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { productId, itemKey, quantity = 1 } = body;

    if (!productId || !itemKey) {
        return NextResponse.json({ error: 'productId, itemKey required' }, { status: 400 });
    }

    // 1. Find metered item price
    const metered = await db.meteredItem.findFirst({
        where: {
            productId,
            key: itemKey,
            isActive: true,
            effectiveFrom: { lte: new Date() },
            OR: [
                { effectiveTo: null },
                { effectiveTo: { gt: new Date() } },
            ],
        },
        orderBy: { version: 'desc' }, // latest version
    });

    if (!metered) {
        return NextResponse.json({
            error: `Không tìm thấy giá cho ${itemKey}`,
            code: 'ITEM_NOT_FOUND',
        }, { status: 404 });
    }

    const total = metered.unitPrice * quantity;

    // 2. Check wallet balance
    const wallet = await db.wallet.findUnique({ where: { userId: session.userId } });
    const balance = wallet?.balanceAvailable ?? 0;

    // 3. Check quota (if exists)
    const now = new Date();
    const quota = await db.usageQuota.findFirst({
        where: {
            userId: session.userId,
            productId,
            itemKey,
            periodEnd: { gt: now },
        },
    });

    const quotaRemaining = quota ? Math.max(0, quota.quotaLimit - quota.quotaUsed) : null;

    return NextResponse.json({
        productId,
        itemKey,
        unitName: metered.unitName,
        unitPrice: metered.unitPrice,
        quantity,
        total,
        balance,
        sufficient: balance >= total,
        quotaRemaining, // null = unlimited
        quotaLimit: quota?.quotaLimit ?? null,
    });
}
