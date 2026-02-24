import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// GET /api/products/:slug — single product with full details
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;

    const product = await db.product.findUnique({
        where: { slug },
        include: {
            variants: { where: { isActive: true }, orderBy: { price: 'asc' } },
            media: { orderBy: { sort: 'asc' } },
            reviews: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            },
            questions: {
                include: { user: { select: { id: true, name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20,
            },
        },
    });

    if (!product || product.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Calculate review stats
    const reviewStats = product.reviews.length > 0
        ? {
            avg: +(product.reviews.reduce((s, r) => s + r.rating, 0) / product.reviews.length).toFixed(1),
            count: product.reviews.length,
        }
        : { avg: 0, count: 0 };

    return NextResponse.json({ product, reviewStats });
}
