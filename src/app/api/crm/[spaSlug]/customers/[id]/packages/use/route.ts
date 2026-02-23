import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string, id: string }> }
) {
    try {
        const { spaSlug, id: customerId } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await request.json();
        const { customerPackageId } = body;

        const customerPackage = await spaDb.customerPackage.findUnique({
            where: { id: customerPackageId, workspaceId: tenant.workspaceId, customerId }
        });

        if (!customerPackage) return NextResponse.json({ error: 'Package not found' }, { status: 404 });

        if (customerPackage.status !== 'ACTIVE') {
            return NextResponse.json({ error: `Package is ${customerPackage.status}` }, { status: 400 });
        }

        if (customerPackage.expiresAt && new Date(customerPackage.expiresAt) < new Date()) {
            await spaDb.customerPackage.update({ where: { id: customerPackage.id }, data: { status: 'EXPIRED' } });
            return NextResponse.json({ error: 'Package has expired' }, { status: 400 });
        }

        if (customerPackage.usedSessions >= customerPackage.totalSessions) {
            return NextResponse.json({ error: 'No sessions remaining' }, { status: 400 });
        }

        const newUsedSessions = customerPackage.usedSessions + 1;
        const newStatus = newUsedSessions >= customerPackage.totalSessions ? 'EXHAUSTED' : 'ACTIVE';

        const updatedPackage = await spaDb.customerPackage.update({
            where: { id: customerPackage.id },
            data: {
                usedSessions: newUsedSessions,
                status: newStatus
            },
            include: { package: true }
        });

        return NextResponse.json({ customerPackage: updatedPackage });
    } catch (error) {
        console.error('[CUSTOMER_PACKAGE_USE_POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
