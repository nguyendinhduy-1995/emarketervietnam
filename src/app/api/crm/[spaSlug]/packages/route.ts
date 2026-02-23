import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const packages = await spaDb.servicePackage.findMany({
            where: { workspaceId: tenant.workspaceId },
            include: { service: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ packages });
    } catch (error) {
        console.error('[PACKAGES_GET]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await request.json();
        const { name, price, totalSessions, validityDays, serviceId } = body;

        const newPackage = await spaDb.servicePackage.create({
            data: {
                workspaceId: tenant.workspaceId,
                name,
                price: Number(price),
                totalSessions: Number(totalSessions),
                validityDays: validityDays ? Number(validityDays) : null,
                serviceId: serviceId || null,
            }
        });

        return NextResponse.json({ package: newPackage }, { status: 201 });
    } catch (error) {
        console.error('[PACKAGES_POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
