import { NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { platformDb } from '@/lib/db/platform';
import { z } from 'zod';

const staffSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    phone: z.string().optional().nullable(),
    role: z.string(),
    baseSalary: z.number().int().min(0),
    isActive: z.boolean(),
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
        const data = staffSchema.parse(body);

        const updated = await spaDb.staff.update({
            where: { id, workspaceId: ws.id },
            data,
        });

        return NextResponse.json({ staff: updated });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
        }
        console.error('[PUT_STAFF_ERROR]', error);
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

        await spaDb.staff.delete({
            where: { id, workspaceId: ws.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[DELETE_STAFF_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
