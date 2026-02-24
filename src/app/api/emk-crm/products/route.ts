import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// GET — list all products
export async function GET() {
    const products = await db.product.findMany({
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(products);
}

// POST — create product
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, tagline, description, usageGuide, industry, icon, priceOriginal, priceRental, priceSale, features, faq } = body;

    if (!name) return NextResponse.json({ error: 'Tên sản phẩm là bắt buộc' }, { status: 400 });

    const slug = slugify(name);
    const key = slug.toUpperCase().replace(/-/g, '_');

    const existing = await db.product.findFirst({ where: { OR: [{ slug }, { key }] } });
    if (existing) return NextResponse.json({ error: 'Sản phẩm đã tồn tại' }, { status: 400 });

    const product = await db.product.create({
        data: {
            key,
            slug,
            name,
            tagline: tagline || null,
            description: description || null,
            usageGuide: usageGuide || null,
            industry: industry || [],
            icon: icon || '📦',
            priceOriginal: priceOriginal || 0,
            priceRental: priceRental || 0,
            priceSale: priceSale || 0,
            priceMonthly: priceRental || 0,
            features: features || null,
            faq: faq || null,
            isActive: true,
        },
    });

    return NextResponse.json(product, { status: 201 });
}

// PATCH — update product
export async function PATCH(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    if (updates.priceRental !== undefined) {
        updates.priceMonthly = updates.priceRental;
    }

    const product = await db.product.update({
        where: { id },
        data: updates,
    });

    return NextResponse.json(product);
}

// DELETE — delete product
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
