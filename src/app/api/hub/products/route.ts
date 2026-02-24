import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const industry = searchParams.get('industry');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: Record<string, unknown> = { isActive: true };
    if (industry) {
        where.industry = { has: industry };
    }

    const products = await platformDb.product.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        take: Math.min(limit, 100),
    });
    return NextResponse.json({ products });
}
