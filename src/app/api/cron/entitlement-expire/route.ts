import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/cron/entitlement-expire
// Called by external cron (e.g. Vercel Cron, crontab, or manual)
// Marks expired entitlements as INACTIVE
export async function POST(req: NextRequest) {
    // Verify cron secret
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find expired entitlements that are still ACTIVE
    const expired = await db.entitlement.findMany({
        where: {
            status: 'ACTIVE',
            activeTo: { lt: now, not: null },
        },
        select: { id: true, workspaceId: true, moduleKey: true, activeTo: true },
    });

    if (expired.length === 0) {
        return NextResponse.json({ ok: true, expired: 0, message: 'No expired entitlements' });
    }

    // Batch update
    const result = await db.entitlement.updateMany({
        where: {
            id: { in: expired.map(e => e.id) },
        },
        data: {
            status: 'INACTIVE',
        },
    });

    // Log each expiry
    for (const ent of expired) {
        await db.eventLog.create({
            data: {
                actorUserId: 'system',
                type: 'ENTITLEMENT_EXPIRED',
                workspaceId: ent.workspaceId,
                payloadJson: { entitlementId: ent.id, moduleKey: ent.moduleKey, activeTo: ent.activeTo?.toISOString() },
            },
        });
    }

    return NextResponse.json({
        ok: true,
        expired: result.count,
        details: expired.map(e => ({ id: e.id, moduleKey: e.moduleKey, workspaceId: e.workspaceId })),
        runAt: now.toISOString(),
    });
}
