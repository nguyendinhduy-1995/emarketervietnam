import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { z } from 'zod';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const categories = await spaDb.productCategory.findMany({
            where: { workspaceId },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(categories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = categorySchema.parse(body);

        const newCategory = await spaDb.productCategory.create({
            data: {
                workspaceId,
                name: parsed.name,
                description: parsed.description,
            },
        });

        return NextResponse.json(newCategory, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
