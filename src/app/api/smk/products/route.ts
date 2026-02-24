import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// GET /api/products — list products with filters & pagination
export async function GET(req: NextRequest) {
    const sp = req.nextUrl.searchParams;

    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(50, Math.max(1, Number(sp.get('limit')) || 20));
    const skip = (page - 1) * limit;

    // Build where clause from filters
    const where: Record<string, unknown> = { status: 'ACTIVE' };

    if (sp.get('brand')) where.brand = sp.get('brand');
    if (sp.get('frameShape')) where.frameShape = sp.get('frameShape');
    if (sp.get('material')) where.material = sp.get('material');
    if (sp.get('gender')) where.gender = sp.get('gender');

    if (sp.get('faceShape')) {
        where.faceShape = { has: sp.get('faceShape') };
    }
    if (sp.get('style')) {
        where.style = { has: sp.get('style') };
    }
    if (sp.get('q')) {
        where.OR = [
            { name: { contains: sp.get('q')!, mode: 'insensitive' } },
            { brand: { contains: sp.get('q')!, mode: 'insensitive' } },
            { tags: { has: sp.get('q')! } },
        ];
    }

    // Price range filter
    const minPrice = Number(sp.get('minPrice')) || undefined;
    const maxPrice = Number(sp.get('maxPrice')) || undefined;
    if (minPrice || maxPrice) {
        where.variants = {
            some: {
                isActive: true,
                ...(minPrice && { price: { gte: minPrice } }),
                ...(maxPrice && { price: { lte: maxPrice } }),
            },
        };
    }

    // Sort
    const sortMap: Record<string, Record<string, string>> = {
        newest: { createdAt: 'desc' },
        price_asc: { name: 'asc' },  // proxy — real sort by variant price done in app
        price_desc: { name: 'desc' },
        name: { name: 'asc' },
    };
    const orderBy = sortMap[sp.get('sort') || ''] || { createdAt: 'desc' };

    const [products, total] = await Promise.all([
        db.product.findMany({
            where,
            include: {
                variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
                media: { orderBy: { sort: 'asc' }, take: 3 },
            },
            orderBy,
            skip,
            take: limit,
        }),
        db.product.count({ where }),
    ]);

    return NextResponse.json({
        products,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}
