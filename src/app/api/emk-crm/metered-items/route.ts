import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

// GET — list metered items for a product (or all)
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId');

    const items = await db.meteredItem.findMany({
        where: productId ? { productId } : {},
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(items);
}

// POST — create metered item
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { productId, key, unitName, unitPrice } = await req.json();
    if (!productId || !key) return NextResponse.json({ error: 'productId và key là bắt buộc' }, { status: 400 });

    const item = await db.meteredItem.create({
        data: {
            productId, key: key.toUpperCase(),
            unitName: unitName || 'lượt',
            unitPrice: unitPrice || 0,
        },
    });
    return NextResponse.json(item, { status: 201 });
}

// PATCH — update metered item
export async function PATCH(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { id, ...updates } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const item = await db.meteredItem.update({ where: { id }, data: updates });
    return NextResponse.json(item);
}

// DELETE — delete metered item
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.meteredItem.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
