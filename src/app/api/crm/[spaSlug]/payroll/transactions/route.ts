import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const transactionSchema = z.object({
    staffId: z.string().min(1, 'Staff is required'),
    receiptId: z.string().optional().nullable(),
    amount: z.number().int().min(1, 'Amount must be greater than 0'),
    notes: z.string().optional().nullable(),
});

export async function GET(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const url = new URL(req.url);
        const staffId = url.searchParams.get('staffId');

        const transactions = await spaDb.commissionTransaction.findMany({
            where: {
                workspaceId: ws.id,
                ...(staffId ? { staffId } : {}),
            },
            include: { staff: true, receipt: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ transactions });
    } catch (error) {
        console.error('[GET_TRANSACTIONS_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = transactionSchema.parse(body);

        const transaction = await spaDb.commissionTransaction.create({
            data: {
                workspaceId: ws.id,
                ...data,
            },
            include: { staff: true },
        });

        return NextResponse.json({ transaction });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[POST_TRANSACTION_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
