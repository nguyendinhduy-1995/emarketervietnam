import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { z } from 'zod';

const categorySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional().nullable(),
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
        const parsed = categorySchema.parse(body);

        const updated = await spaDb.productCategory.updateMany({
            where: { id, workspaceId },
            data: {
                name: parsed.name,
                description: parsed.description,
            },
        });

        if (updated.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
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

        // Check if category is used by products
        const productCount = await spaDb.product.count({
            where: { categoryId: id, workspaceId }
        });

        if (productCount > 0) {
            return NextResponse.json({ error: 'Cannot delete category containing products. Reassign or delete products first.' }, { status: 400 });
        }

        const deleted = await spaDb.productCategory.deleteMany({
            where: { id, workspaceId },
        });

        if (deleted.count === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
