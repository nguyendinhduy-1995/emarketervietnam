import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireTenant } from '@/lib/tenant';
import { spaDb } from '@/lib/db/spa';

const customerSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    tags: z.array(z.string()).optional(),
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
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const where = {
        workspaceId: tenant.workspaceId,
        ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: 'insensitive' as const } },
                    { phone: { contains: search } },
                ],
            }
            : {}),
    };

    const [customers, total] = await Promise.all([
        spaDb.customer.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        spaDb.customer.count({ where }),
    ]);

    return NextResponse.json({ customers, total, page, totalPages: Math.ceil(total / limit) });
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
        const data = customerSchema.parse(body);

        const customer = await spaDb.customer.create({
            data: {
                workspaceId: tenant.workspaceId,
                name: data.name,
                phone: data.phone,
                email: data.email,
                tagsJson: data.tags || [],
                notes: data.notes,
            },
        });

        return NextResponse.json({ customer }, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
