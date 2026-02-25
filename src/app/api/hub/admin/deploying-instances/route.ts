import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * GET /api/hub/admin/deploying-instances
 * 
 * Internal endpoint for CRM deployer to poll for instances needing deployment.
 * Authenticated via DEPLOY_CALLBACK_SECRET.
 */
export async function GET(req: NextRequest) {
    const secret = req.headers.get('x-deploy-secret');
    if (secret !== process.env.DEPLOY_CALLBACK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await db.crmInstance.findMany({
        where: { status: 'DEPLOYING' },
        select: {
            id: true,
            workspaceId: true,
            domain: true,
            dbName: true,
            adminUserId: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
        take: 5,
    });

    return NextResponse.json({ instances });
}
