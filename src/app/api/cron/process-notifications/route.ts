import { NextRequest, NextResponse } from 'next/server';
import { processNotifications } from '@/lib/notifications/processor';

/**
 * POST /api/cron/process-notifications
 * 
 * Cron endpoint: processes pending notification queue → sends emails.
 * Called every 5 minutes.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processNotifications(20); // batch of 20

    return NextResponse.json({
        ok: true,
        ...result,
        runAt: new Date().toISOString(),
    });
}
