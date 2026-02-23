import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant';
import { spaDb } from '@/lib/db/spa';

const receiptSchema = z.object({
    customerId: z.string(),
    items: z.array(z.object({
        serviceId: z.string(),
        qty: z.number().min(1).default(1),
        price: z.number().min(0),
    })).min(1),
    paid: z.number().min(0).default(0),
    notes: z.string().optional(),
});

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    const { spaSlug } = await params;
    const tenant = await requireTenant(spaSlug);
    if (tenant instanceof NextResponse) return tenant;

    const receipts = await spaDb.receipt.findMany({
        where: { workspaceId: tenant.workspaceId },
        include: {
            customer: { select: { id: true, name: true, phone: true } },
            items: {
                include: {
                    service: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json({ receipts });
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
        const data = receiptSchema.parse(body);

        const total = data.items.reduce((sum, item) => sum + item.price * item.qty, 0);
        const remaining = total - data.paid;

        const receipt = await spaDb.receipt.create({
            data: {
                workspaceId: tenant.workspaceId,
                customerId: data.customerId,
                total,
                paid: data.paid,
                remaining: Math.max(0, remaining),
                notes: data.notes,
                items: {
                    create: data.items.map((item) => ({
                        serviceId: item.serviceId,
                        qty: item.qty,
                        price: item.price,
                    })),
                },
            },
            include: {
                items: { include: { service: true } },
                customer: true,
            },
        });

        return NextResponse.json({ receipt }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
