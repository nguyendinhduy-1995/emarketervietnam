import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);
    if (!workspaceId) {
        return NextResponse.json({ error: 'No workspace' }, { status: 404 });
    }

    const instances = await platformDb.productInstance.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
    });

    const jobs = await platformDb.provisioningJob.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 10,
    });

    return NextResponse.json({ instances, provisioningJobs: jobs });
}
