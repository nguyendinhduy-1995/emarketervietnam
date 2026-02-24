import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET() {
    const products = await platformDb.product.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ products });
}
