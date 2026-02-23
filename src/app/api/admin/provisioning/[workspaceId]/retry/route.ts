import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { enqueueProvisioningJob } from '@/lib/queue/provisioning';
import { platformDb } from '@/lib/db/platform';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ workspaceId: string }> }
) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const { workspaceId } = await params;

    // Reset instance status
    await platformDb.productInstance.updateMany({
        where: { workspaceId, status: 'FAILED' },
        data: { status: 'PENDING', lastError: null },
    });

    // Re-enqueue
    await enqueueProvisioningJob(workspaceId);

    await platformDb.auditLog.create({
        data: {
            workspaceId,
            actorUserId: authResult.user.userId,
            action: 'ADMIN_RETRY_PROVISIONING',
        },
    });

    return NextResponse.json({ success: true, message: 'Provisioning retried' });
}
