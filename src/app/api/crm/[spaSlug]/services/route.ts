import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant';
import { spaDb } from '@/lib/db/spa';

const serviceSchema = z.object({
    name: z.string().min(1),
    durationMin: z.number().min(5).default(60),
    price: z.number().min(0).default(0),
    category: z.string().optional(),
    isActive: z.boolean().default(true),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    const { spaSlug } = await params;
    const tenant = await requireTenant(spaSlug);
    if (tenant instanceof NextResponse) return tenant;

    const services = await spaDb.service.findMany({
        where: { workspaceId: tenant.workspaceId },
        orderBy: { name: 'asc' },
    });

    return NextResponse.json({ services });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await req.json();
        const data = serviceSchema.parse(body);

        const service = await spaDb.service.create({
            data: {
                workspaceId: tenant.workspaceId,
                ...data,
            },
        });

        return NextResponse.json({ service }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
