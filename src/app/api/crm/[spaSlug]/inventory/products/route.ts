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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const products = await spaDb.product.findMany({
            where: { workspaceId },
            include: { category: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(products);
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

        if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await request.json();
        const parsed = productSchema.parse(body);

        const newProduct = await spaDb.product.create({
            data: {
                workspaceId,
                name: parsed.name,
                categoryId: parsed.categoryId,
                sku: parsed.sku,
                price: parsed.price,
                costPrice: parsed.costPrice,
                reorderLevel: parsed.reorderLevel,
                stockQuantity: 0,
            },
            include: { category: true },
        });

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
