import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const modules = await platformDb.module.findMany({
        orderBy: { name: 'asc' },
    });

    return NextResponse.json({ modules });
}

const moduleSchema = z.object({
    key: z.string().min(2),
    name: z.string().min(2),
    description: z.string().optional(),
    priceMonthly: z.number().min(0),
    icon: z.string().optional(),
    isActive: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await req.json();
        const data = moduleSchema.parse(body);

        const module = await platformDb.module.upsert({
            where: { key: data.key },
            create: data,
            update: data,
        });

        return NextResponse.json({ module });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
