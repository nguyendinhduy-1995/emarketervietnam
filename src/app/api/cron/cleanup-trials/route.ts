import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// GET /api/cron/cleanup-trials — Delete expired trial workspaces (14 days)
// Run daily via cron job: curl -H "x-cron-secret: $CRON_SECRET" /api/cron/cleanup-trials
export async function GET(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find all expired trial accounts
    const expiredTrials = await db.emkAccount.findMany({
        where: {
            plan: 'TRIAL',
            status: 'ACTIVE',
            trialEndAt: { lt: now },
        },
        include: {
            workspace: {
                include: { org: true },
            },
        },
    });

    if (expiredTrials.length === 0) {
        return NextResponse.json({ ok: true, message: 'Không có trial nào hết hạn', cleaned: 0 });
    }

    const cleaned: string[] = [];

    for (const trial of expiredTrials) {
        try {
            const wsId = trial.workspaceId;
            const orgId = trial.workspace.orgId;

            await db.$transaction(async (tx) => {
                // Delete in order: dependents → parents
                await tx.notificationQueue.deleteMany({ where: { userId: trial.workspace.org.ownerUserId } });
                await tx.entitlement.deleteMany({ where: { workspaceId: wsId } });
                await tx.subscription.deleteMany({ where: { workspaceId: wsId } });
                await tx.membership.deleteMany({ where: { workspaceId: wsId } });
                await tx.emkAccount.delete({ where: { id: trial.id } });
                await tx.workspace.delete({ where: { id: wsId } });
                await tx.org.delete({ where: { id: orgId } });

                // Log cleanup
                await tx.eventLog.create({
                    data: {
                        actorUserId: 'SYSTEM',
                        type: 'TRIAL_EXPIRED_CLEANUP',
                        payloadJson: {
                            workspaceId: wsId,
                            slug: trial.workspace.slug,
                            shopName: trial.workspace.name,
                            expiredAt: trial.trialEndAt?.toISOString(),
                        },
                    },
                });
            });

            cleaned.push(`${trial.workspace.name} (${trial.workspace.slug})`);
        } catch (err) {
            console.error(`[Cleanup] Failed for workspace ${trial.workspace.slug}:`, err);
        }
    }

    return NextResponse.json({
        ok: true,
        message: `Đã dọn ${cleaned.length} trial hết hạn`,
        cleaned: cleaned.length,
        details: cleaned,
    });
}
