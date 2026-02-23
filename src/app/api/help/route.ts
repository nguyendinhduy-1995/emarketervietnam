import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const productKey = searchParams.get('productKey') || 'SPA_CRM';
    const search = searchParams.get('search') || '';

    const docs = await platformDb.helpDoc.findMany({
        where: {
            productKey,
            ...(search
                ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { contentMd: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        },
        orderBy: { sortOrder: 'asc' },
        select: {
            id: true,
            title: true,
            slug: true,
            moduleKey: true,
            sortOrder: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({ docs });
}
