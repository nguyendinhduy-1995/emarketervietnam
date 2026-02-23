import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const generateSchema = z.object({
    month: z.number().int().min(1).max(12),
    year: z.number().int().min(2000),
});

export async function POST(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = generateSchema.parse(body);
        const { month, year } = data;

        // Date range for the month
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 1);

        // Get all active staff (or staff who have transactions this month)
        const staffList = await spaDb.staff.findMany({
            where: { workspaceId: ws.id, isActive: true },
        });

        const generated = [];

        for (const staff of staffList) {
            // Find all commission transactions for this staff in this month
            const transactions = await spaDb.commissionTransaction.findMany({
                where: {
                    workspaceId: ws.id,
                    staffId: staff.id,
                    createdAt: {
                        gte: startDate,
                        lt: endDate,
                    },
                },
            });

            const totalCommission = transactions.reduce((sum: number, t: any) => sum + t.amount, 0);
            const netPay = staff.baseSalary + totalCommission;

            // Upsert the payslip
            const payslip = await spaDb.payslip.upsert({
                where: {
                    workspaceId_staffId_month_year: {
                        workspaceId: ws.id,
                        staffId: staff.id,
                        month,
                        year,
                    },
                },
                update: {
                    baseSalary: staff.baseSalary,
                    totalCommission,
                    netPay: staff.baseSalary + totalCommission, // Doesn't rewrite manual allowances if we were careful, but here we just reset
                    // Keep existing allowances/deductions/status if draft
                },
                create: {
                    workspaceId: ws.id,
                    staffId: staff.id,
                    month,
                    year,
                    baseSalary: staff.baseSalary,
                    totalCommission,
                    totalAllowance: 0,
                    totalDeduction: 0,
                    netPay,
                    status: 'DRAFT',
                },
            });

            // Recalculate netPay correctly by fetching again to account for existing allowances during update
            const finalPayslip = await spaDb.payslip.update({
                where: { id: payslip.id },
                data: {
                    netPay: payslip.baseSalary + payslip.totalCommission + payslip.totalAllowance - payslip.totalDeduction,
                }
            });

            generated.push(finalPayslip);
        }

        return NextResponse.json({ payslips: generated });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[GENERATE_PAYSLIPS_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
