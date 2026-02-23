import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string, id: string }> }
) {
    try {
        const { spaSlug, id: customerId } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const customerPackages = await spaDb.customerPackage.findMany({
            where: { workspaceId: tenant.workspaceId, customerId },
            include: { package: true },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ customerPackages });
    } catch (error) {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string, id: string }> }
) {
    try {
        const { spaSlug, id: customerId } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await request.json();
        const { packageId } = body;

        const pkgTemplate = await spaDb.servicePackage.findUnique({
            where: { id: packageId, workspaceId: tenant.workspaceId }
        });

        if (!pkgTemplate) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

        let expiresAt = null;
        if (pkgTemplate.validityDays) {
            expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + pkgTemplate.validityDays);
        }

        const customerPackage = await spaDb.customerPackage.create({
            data: {
                workspaceId: tenant.workspaceId,
                customerId,
                packageId,
                totalSessions: pkgTemplate.totalSessions,
                usedSessions: 0,
                expiresAt,
                status: 'ACTIVE'
            },
            include: { package: true }
        });

        // Note: A real implementation might also automatically create a Receipt to charge the customer for this package.
        // For this MVP, we just assign it to them.

        return NextResponse.json({ customerPackage }, { status: 201 });
    } catch (error) {
        console.error('[CUSTOMER_PACKAGE_POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
