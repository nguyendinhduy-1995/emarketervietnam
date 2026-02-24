import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';

// GET — list coupons
export async function GET() {
    const coupons = await db.coupon.findMany({
        include: { _count: { select: { redemptions: true } } },
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(coupons);
}

// POST — create coupon
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const { code, type, value, minOrderAmount, maxDiscount, maxUses, productIds, planIds, startsAt, expiresAt } = await req.json();
    if (!code || !value) return NextResponse.json({ error: 'code và value là bắt buộc' }, { status: 400 });

    const existing = await db.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) return NextResponse.json({ error: 'Mã đã tồn tại' }, { status: 400 });

    const coupon = await db.coupon.create({
        data: {
            code: code.toUpperCase(), type: type || 'PERCENT', value,
            minOrderAmount: minOrderAmount || 0, maxDiscount: maxDiscount || null,
            maxUses: maxUses || 0, productIds: productIds || [], planIds: planIds || [],
            startsAt: startsAt ? new Date(startsAt) : new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            createdBy: String(auth.user.id),
        },
    });
    return NextResponse.json(coupon, { status: 201 });
}

// PATCH — update coupon
export async function PATCH(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
    if (updates.expiresAt) updates.expiresAt = new Date(updates.expiresAt);

    const coupon = await db.coupon.update({ where: { id }, data: updates });
    return NextResponse.json(coupon);
}

// DELETE — deactivate coupon
export async function DELETE(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.coupon.update({ where: { id }, data: { isActive: false } });
    return NextResponse.json({ ok: true });
}
