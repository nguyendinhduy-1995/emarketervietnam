import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

export async function GET(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const url = new URL(req.url);
        const month = url.searchParams.get('month');
        const year = url.searchParams.get('year');

        const payslips = await spaDb.payslip.findMany({
            where: {
                workspaceId: ws.id,
                ...(month ? { month: parseInt(month) } : {}),
                ...(year ? { year: parseInt(year) } : {}),
            },
            include: { staff: true },
            orderBy: [{ year: 'desc' }, { month: 'desc' }],
        });

        return NextResponse.json({ payslips });
    } catch (error) {
        console.error('[GET_PAYSLIPS_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
