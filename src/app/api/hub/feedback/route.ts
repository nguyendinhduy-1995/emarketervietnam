import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await req.json();
    const { type, message, page } = body;

    if (!message?.trim()) {
        return NextResponse.json({ error: 'Vui lòng nhập nội dung' }, { status: 400 });
    }

    // Store feedback as EventLog
    await platformDb.eventLog.create({
        data: {
            actorUserId: user.userId,
            type: 'FEEDBACK_SUBMITTED',
            payloadJson: {
                feedbackType: type || 'general',
                message: message.trim(),
                page: page || null,
                userAgent: req.headers.get('user-agent') || null,
                timestamp: new Date().toISOString(),
            },
        },
    });

    return NextResponse.json({ ok: true, message: 'Cảm ơn bạn đã góp ý!' });
}
