import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { z } from 'zod';

const transactionSchema = z.object({
    productId: z.string().min(1),
    type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
    quantity: z.number().int(),
    notes: z.string().optional().nullable(),
});

export async function GET(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspaceId = request.headers.get('x-workspace-id');

        if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const url = new URL(request.url);
        const productId = url.searchParams.get('productId');
        const take = parseInt(url.searchParams.get('take') || '50');

        const transactions = await spaDb.stockTransaction.findMany({
            where: {
                workspaceId,
                ...(productId ? { productId } : {}),
            },
            include: {
                product: { select: { name: true, sku: true } }
            },
            orderBy: { createdAt: 'desc' },
            take,
        });

        return NextResponse.json(transactions);
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
        const parsed = transactionSchema.parse(body);

        const result = await spaDb.$transaction(async (tx: any) => {
            const product = await tx.product.findUnique({
                where: { id: parsed.productId, workspaceId }
            });

            if (!product) {
                throw new Error('Product not found in this workspace.');
            }

            let appliedQuantity = parsed.quantity;
            if (parsed.type === 'OUT' && appliedQuantity > 0) {
                appliedQuantity = -appliedQuantity;
            }
            if (parsed.type === 'IN' && appliedQuantity < 0) {
                appliedQuantity = Math.abs(appliedQuantity);
            }

            if (product.stockQuantity + appliedQuantity < 0) {
                throw new Error(`Insufficient stock. Current stock is ${product.stockQuantity}.`);
            }

            const txnRecord = await tx.stockTransaction.create({
                data: {
                    workspaceId,
                    productId: parsed.productId,
                    type: parsed.type,
                    quantity: appliedQuantity,
                    notes: parsed.notes,
                }
            });

            await tx.product.update({
                where: { id: parsed.productId },
                data: {
                    stockQuantity: { increment: appliedQuantity }
                }
            });

            return txnRecord;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: (error as any).errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
