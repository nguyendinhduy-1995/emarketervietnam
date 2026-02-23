import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { z } from 'zod';

const productSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    categoryId: z.string().optional().nullable(),
    sku: z.string().optional().nullable(),
    price: z.number().min(0).default(0),
    costPrice: z.number().min(0).default(0),
    reorderLevel: z.number().min(0).default(0),
});

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string; id: string }> }
) {
    try {
        const { spaSlug, id } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = productSchema.parse(body);

        const updated = await spaDb.product.updateMany({
            where: { id, workspaceId },
            data: {
                name: parsed.name,
                categoryId: parsed.categoryId,
                sku: parsed.sku,
                price: parsed.price,
                costPrice: parsed.costPrice,
                reorderLevel: parsed.reorderLevel,
            },
        });

        if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string; id: string }> }
) {
    try {
        const { spaSlug, id } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const deleted = await spaDb.product.deleteMany({
            where: { id, workspaceId },
        });

        if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
