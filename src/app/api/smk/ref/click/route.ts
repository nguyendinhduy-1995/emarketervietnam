import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/ref/click — record attribution session from referral link
export async function POST(req: NextRequest) {
    const { partnerCode, sessionId, userId } = await req.json();

    if (!partnerCode || !sessionId) {
        return NextResponse.json({ error: 'partnerCode and sessionId required' }, { status: 400 });
    }

    const partner = await db.partnerProfile.findUnique({
        where: { partnerCode },
        select: { id: true, status: true },
    });

    if (!partner || partner.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Invalid partner' }, { status: 404 });
    }

    // Upsert attribution session (7-day window)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const existing = await db.attributionSession.findFirst({
        where: { sessionId, partnerId: partner.id },
    });

    if (existing) {
        // Update last touch
        await db.attributionSession.update({
            where: { id: existing.id },
            data: { lastTouch: new Date(), expiresAt, userId: userId || existing.userId },
        });
    } else {
        await db.attributionSession.create({
            data: {
                sessionId,
                userId,
                partnerId: partner.id,
                source: 'REF_LINK',
                expiresAt,
            },
        });
    }

    // Log event
    await db.eventLog.create({
        data: {
            type: 'REF_CLICK',
            partnerId: partner.id,
            userId,
            payload: { partnerCode, sessionId },
        },
    });

    return NextResponse.json({ ok: true });
}
