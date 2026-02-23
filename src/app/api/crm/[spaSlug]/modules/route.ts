import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant';
import { platformDb } from '@/lib/db/platform';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    const { spaSlug } = await params;
    const tenant = await requireTenant(spaSlug);
    if (tenant instanceof NextResponse) return tenant;

    const modules = await platformDb.module.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    const entitlements = await platformDb.entitlement.findMany({
        where: { workspaceId: tenant.workspaceId },
    });

    const entMap = Object.fromEntries(
        entitlements.map((e) => [e.moduleKey, { status: e.status, activeTo: e.activeTo }])
    );

    return NextResponse.json({
        modules: modules.map((m) => ({
            key: m.key,
            name: m.name,
            description: m.description,
            icon: m.icon,
            priceMonthly: m.priceMonthly,
            entitlement: entMap[m.key] || null,
        })),
        upgradeUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace`,
    });
}
