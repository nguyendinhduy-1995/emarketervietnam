import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/ai/personalize — personalized product recommendations
export async function GET(req: NextRequest) {
    // S5: userId from session cookie (optional for personalization)
    const userId = getCustomerSessionFromRequest(req)?.userId || null;

    // Strategy 1: Based on view history
    let viewedCategories: string[] = [];
    let viewedBrands: string[] = [];

    if (userId) {
        const recentViews = await db.viewHistory.findMany({
            where: { userId },
            include: { product: { select: { frameShape: true, brand: true, material: true, faceShape: true } } },
            orderBy: { viewedAt: 'desc' },
            take: 20,
        });

        viewedCategories = [...new Set(recentViews.map((v) => v.product.frameShape).filter(Boolean))] as string[];
        viewedBrands = [...new Set(recentViews.map((v) => v.product.brand).filter(Boolean))] as string[];
    }

    // Strategy 2: Based on purchase history
    let purchasedBrands: string[] = [];
    if (userId) {
        const orders = await db.orderItem.findMany({
            where: { order: { userId, status: { in: ['DELIVERED', 'SHIPPING'] } } },
            include: { variant: { include: { product: { select: { brand: true, frameShape: true } } } } },
            take: 10,
        });
        purchasedBrands = [...new Set(orders.map((o) => o.variant.product.brand).filter(Boolean))] as string[];
    }

    // Fetch personalized recommendations
    const [forYou, trending, newArrivals] = await Promise.all([
        // For you: based on viewed categories/brands
        db.product.findMany({
            where: {
                status: 'ACTIVE',
                ...(viewedCategories.length > 0 && { frameShape: { in: viewedCategories as never[] } }),
                ...(viewedBrands.length > 0 && { brand: { in: viewedBrands } }),
            },
            include: { variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 }, media: { take: 1 } },
            take: 8,
            orderBy: { createdAt: 'desc' },
        }),

        // Trending: most viewed in last 7 days
        db.product.findMany({
            where: {
                status: 'ACTIVE',
                viewHistory: { some: { viewedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
            },
            include: {
                variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
                media: { take: 1 },
                _count: { select: { viewHistory: true } },
            },
            orderBy: { viewHistory: { _count: 'desc' } },
            take: 8,
        }),

        // New arrivals
        db.product.findMany({
            where: { status: 'ACTIVE' },
            include: { variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 }, media: { take: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 8,
        }),
    ]);

    // Fallback: if no personalized results, use new arrivals
    const forYouResults = forYou.length > 0 ? forYou : newArrivals;

    const format = (products: typeof forYou) =>
        products.map((p) => ({
            id: p.id,
            slug: p.slug,
            name: p.name,
            brand: p.brand,
            frameShape: p.frameShape,
            imageUrl: p.media[0]?.url || null,
            price: p.variants[0]?.price || 0,
            compareAtPrice: p.variants[0]?.compareAtPrice || null,
        }));

    return NextResponse.json({
        forYou: format(forYouResults),
        trending: format(trending),
        newArrivals: format(newArrivals),
        hasPersonalData: viewedCategories.length > 0 || purchasedBrands.length > 0,
    });
}
