import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant';
import { spaDb } from '@/lib/db/spa';

const appointmentSchema = z.object({
    customerId: z.string(),
    serviceId: z.string(),
    startAt: z.string().transform((s) => new Date(s)),
    endAt: z.string().transform((s) => new Date(s)),
    status: z.enum(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).default('SCHEDULED'),
    notes: z.string().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    const { spaSlug } = await params;
    const tenant = await requireTenant(spaSlug);
    if (tenant instanceof NextResponse) return tenant;

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { workspaceId: tenant.workspaceId };

    if (date) {
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setDate(dayEnd.getDate() + 1);
        where.startAt = { gte: dayStart, lt: dayEnd };
    }
    if (status) where.status = status;

    const appointments = await spaDb.appointment.findMany({
        where,
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            service: { select: { id: true, name: true, durationMin: true, price: true } },
        },
        orderBy: { startAt: 'asc' },
    });

    return NextResponse.json({ appointments });
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
        const data = appointmentSchema.parse(body);

        const appointment = await spaDb.appointment.create({
            data: {
                workspaceId: tenant.workspaceId,
                ...data,
            },
            include: {
                customer: { select: { id: true, name: true } },
                service: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ appointment }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
