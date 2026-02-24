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

// GET — list all products with sub-resources
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // CRM | APP | DIGITAL
    const status = searchParams.get('status'); // DRAFT | PUBLISHED | ARCHIVED

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const products = await db.product.findMany({
        where,
        include: {
            meteredItems: true,
            digitalAssets: true,
            plans: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });
    return NextResponse.json(products);
}

// POST — create product
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const {
        name, type, billingModel, deliveryMethod, tagline, description,
        usageGuide, industry, icon, priceOriginal, priceRental, priceSale,
        features, faq, thumbnail, metadata,
    } = body;

    if (!name) return NextResponse.json({ error: 'Tên sản phẩm là bắt buộc' }, { status: 400 });

    const slug = slugify(name);
    const key = slug.toUpperCase().replace(/-/g, '_');

    const existing = await db.product.findFirst({ where: { OR: [{ slug }, { key }] } });
    if (existing) return NextResponse.json({ error: 'Sản phẩm đã tồn tại' }, { status: 400 });

    // Auto-determine delivery based on type if not specified
    const derivedDelivery = deliveryMethod || (
        type === 'APP' ? 'ENABLE_APP' :
            type === 'DIGITAL' ? 'DOWNLOAD_GRANT' : 'PROVISION_TENANT'
    );
    const derivedBilling = billingModel || (
        type === 'APP' ? 'PAYG' :
            type === 'DIGITAL' ? 'ONE_TIME' : 'SUBSCRIPTION'
    );

    const product = await db.product.create({
        data: {
            key, slug, name,
            type: type || 'CRM',
            billingModel: derivedBilling,
            deliveryMethod: derivedDelivery,
            status: 'DRAFT',
            tagline: tagline || null,
            description: description || null,
            usageGuide: usageGuide || null,
            thumbnail: thumbnail || null,
            industry: industry || [],
            icon: icon || '📦',
            priceOriginal: priceOriginal || 0,
            priceRental: priceRental || 0,
            priceSale: priceSale || 0,
            priceMonthly: priceRental || 0,
            features: features || null,
            faq: faq || null,
            metadata: metadata || null,
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

// DELETE — delete product (cascade deletes meteredItems, digitalAssets, plans)
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
