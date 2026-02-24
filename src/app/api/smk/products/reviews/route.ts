import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/products/reviews?productId=xxx — get reviews for a product
export async function GET(req: NextRequest) {
    const productId = req.nextUrl.searchParams.get('productId');
    if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 });

    const page = Math.max(1, Number(req.nextUrl.searchParams.get('page')) || 1);
    const limit = 10;

    const [reviews, total, avgRating] = await Promise.all([
        db.review.findMany({
            where: { productId },
            include: { user: { select: { name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.review.count({ where: { productId } }),
        db.review.aggregate({
            where: { productId },
            _avg: { rating: true },
            _count: true,
        }),
    ]);

    // Rating distribution
    const distribution = await db.review.groupBy({
        by: ['rating'],
        where: { productId },
        _count: true,
    });
    const ratingDist = Object.fromEntries(
        distribution.map((d: { rating: number; _count: number }) => [d.rating, d._count])
    );

    return NextResponse.json({
        reviews,
        stats: {
            avg: avgRating._avg.rating || 0,
            total: avgRating._count,
            distribution: { 5: ratingDist[5] || 0, 4: ratingDist[4] || 0, 3: ratingDist[3] || 0, 2: ratingDist[2] || 0, 1: ratingDist[1] || 0 },
        },
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

// POST /api/products/reviews — create a review (only for delivered orders)
export async function POST(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { productId, rating, title, body, media } = await req.json();

    if (!productId || !rating || rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'productId and rating (1-5) required' }, { status: 400 });
    }

    // Check if user has purchased this product (delivered order)
    const hasPurchased = await db.orderItem.findFirst({
        where: {
            order: { userId, status: 'DELIVERED' },
            variant: { productId },
        },
    });

    // Check for existing review
    const existing = await db.review.findFirst({
        where: { productId, userId },
    });
    if (existing) {
        return NextResponse.json({ error: 'Bạn đã đánh giá sản phẩm này rồi' }, { status: 409 });
    }

    const review = await db.review.create({
        data: {
            productId,
            userId,
            rating,
            title: title || null,
            body: body || null,
            media: media || null,
            isVerified: !!hasPurchased,
        },
        include: { user: { select: { name: true, avatar: true } } },
    });

    return NextResponse.json({ review }, { status: 201 });
}
