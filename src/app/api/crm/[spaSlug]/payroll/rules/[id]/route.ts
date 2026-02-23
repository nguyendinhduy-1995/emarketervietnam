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

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ spaSlug: string; id: string }> }
) {
    try {
        const { spaSlug, id } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        const body = await req.json();
        const data = ruleSchema.parse(body);

        const updated = await spaDb.commissionRule.update({
            where: { id, workspaceId: ws.id },
            data,
            include: { staff: true, service: true },
        });

        return NextResponse.json({ rule: updated });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[PUT_RULE_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ spaSlug: string; id: string }> }
) {
    try {
        const { spaSlug, id } = await params;
        const ws = await platformDb.workspace.findUnique({ where: { slug: spaSlug } });
        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        await spaDb.commissionRule.delete({
            where: { id, workspaceId: ws.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE_RULE_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
