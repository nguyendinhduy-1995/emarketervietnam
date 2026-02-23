import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const ruleSchema = z.object({
    staffId: z.string().optional().nullable(),
    serviceId: z.string().optional().nullable(),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.number().int().min(0),
});

export async function GET(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const rules = await spaDb.commissionRule.findMany({
            where: { workspaceId: ws.id },
            include: { staff: true, service: true },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ rules });
    } catch (error) {
        console.error('[GET_RULES_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = ruleSchema.parse(body);

        const rule = await spaDb.commissionRule.create({
            data: {
                workspaceId: ws.id,
                ...data,
            },
            include: { staff: true, service: true },
        });

        return NextResponse.json({ rule });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[POST_RULE_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
