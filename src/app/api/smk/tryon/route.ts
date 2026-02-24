import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/tryon — get frame recommendations for try-on based on face shape
export async function POST(req: NextRequest) {
    const { faceShape = 'oval' } = await req.json().catch(() => ({ faceShape: 'oval' }));

    // Face shape → recommended frame shapes mapping
    const recommendations: Record<string, string[]> = {
        oval: ['AVIATOR', 'SQUARE', 'GEOMETRIC', 'BROWLINE'],
        round: ['SQUARE', 'RECTANGLE', 'GEOMETRIC', 'BROWLINE'],
        square: ['ROUND', 'OVAL', 'AVIATOR', 'CAT_EYE'],
        heart: ['ROUND', 'OVAL', 'CAT_EYE', 'AVIATOR'],
        long: ['ROUND', 'SQUARE', 'BROWLINE', 'GEOMETRIC'],
    };

    const faceKey = faceShape.toLowerCase();
    const recShapes = recommendations[faceKey] || recommendations.oval;

    const products = await db.product.findMany({
        where: {
            status: 'ACTIVE',
            frameShape: { in: recShapes as ('SQUARE' | 'ROUND' | 'OVAL' | 'CAT_EYE' | 'AVIATOR' | 'RECTANGLE' | 'GEOMETRIC' | 'BROWLINE')[] },
        },
        include: {
            variants: { take: 1, orderBy: { price: 'asc' } },
            media: { take: 1 },
        },
        take: 8,
    });

    return NextResponse.json({
        faceShape: faceKey,
        recommendedShapes: recShapes,
        products: products.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand,
            frameShape: p.frameShape,
            price: p.variants[0]?.price || 0,
            image: p.media[0]?.url || null,
        })),
    });
}
