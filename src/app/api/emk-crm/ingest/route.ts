import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// Event ingest endpoint: Hub → CRM sync
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { eventType, payload, workspaceId, actorUserId } = body;

    if (!eventType) return NextResponse.json({ error: 'Missing eventType' }, { status: 400 });

    // Log to EventLog
    await platformDb.eventLog.create({
        data: { type: eventType, payloadJson: payload, workspaceId, actorUserId },
    });

    // Update EmkAccount lastActivityAt if workspace provided
    if (workspaceId) {
        await platformDb.emkAccount.updateMany({
            where: { workspaceId },
            data: { lastActivityAt: new Date() },
        });
    }

    return NextResponse.json({ ok: true });
}
