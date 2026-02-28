import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

/**
 * GET /api/emk-crm/estudio/instances
 *
 * Fetch all eStudio instances for CRM management.
 * Filters CrmInstance records where the productKey matches eStudio.
 */
export async function GET() {
    try {
        // Get all CRM instances that are eStudio apps
        const instances = await platformDb.crmInstance.findMany({
            where: {
                OR: [
                    { deployLog: { path: ['productKey'], equals: 'ESTUDIO' } },
                    { deployLog: { path: ['productKey'], equals: 'estudio' } },
                    // Also include instances with ESTUDIO in domain for broader matching
                    { domain: { contains: 'estudio' } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                domain: true,
                status: true,
                crmUrl: true,
                createdAt: true,
                workspaceId: true,
            },
        });

        return NextResponse.json({
            instances: instances.map(i => ({
                id: i.id,
                domain: i.domain,
                status: i.status,
                crmUrl: i.crmUrl,
                createdAt: i.createdAt.toISOString(),
                workspaceId: i.workspaceId,
            })),
        });
    } catch (err) {
        console.error('[ESTUDIO] instances fetch error:', err);
        return NextResponse.json({ instances: [] });
    }
}
