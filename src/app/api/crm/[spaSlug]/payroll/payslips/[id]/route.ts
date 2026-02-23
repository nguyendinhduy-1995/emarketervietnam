import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const updateSchema = z.object({
    totalAllowance: z.number().int().min(0).optional(),
    totalDeduction: z.number().int().min(0).optional(),
    status: z.enum(['DRAFT', 'PAID']).optional(),
});

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ spaSlug: string; id: string }> }
) {
    try {
        const { spaSlug, id } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = updateSchema.parse(body);

        const current = await spaDb.payslip.findUnique({ where: { id, workspaceId: ws.id } });
        if (!current) return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });

        const totalAllowance = data.totalAllowance ?? current.totalAllowance;
        const totalDeduction = data.totalDeduction ?? current.totalDeduction;
        const netPay = current.baseSalary + current.totalCommission + totalAllowance - totalDeduction;

        const updated = await spaDb.payslip.update({
            where: { id, workspaceId: ws.id },
            data: {
                ...data,
                netPay,
            },
            include: { staff: true },
        });

        return NextResponse.json({ payslip: updated });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[PUT_PAYSLIP_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
