import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const slug = searchParams.get('slug') || '';

    if (slug) {
        const doc = await platformDb.helpDoc.findUnique({
            where: { slug },
        });
        return NextResponse.json({ doc });
    }

    const docs = await platformDb.helpDoc.findMany({
        where: {
            productKey: 'SPA_CRM',
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
        },
    });

    return NextResponse.json({ docs });
}
