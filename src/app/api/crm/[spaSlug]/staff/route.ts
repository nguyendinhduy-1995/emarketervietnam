import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const staffSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    role: z.string().default('STAFF'),
    baseSalary: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
});

export async function GET(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const url = new URL(req.url);
        const search = url.searchParams.get('search') || '';

        const staff = await spaDb.staff.findMany({
            where: {
                workspaceId: ws.id,
                ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ staff });
    } catch (error) {
        console.error('[GET_STAFF_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = staffSchema.parse(body);

        const staff = await spaDb.staff.create({
            data: {
                workspaceId: ws.id,
                ...data,
            },
        });

        return NextResponse.json({ staff });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[POST_STAFF_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
