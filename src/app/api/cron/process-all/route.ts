import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cron/process-all
 * 
 * Unified cron endpoint — runs all periodic tasks in one call.
 * Alternative to individual cron schedules.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = req.nextUrl.origin;
    const headers = { 'x-cron-secret': process.env.CRON_SECRET || '' };
    const results: Record<string, unknown> = {};

    // 1. Subscription renew
    try {
        const res = await fetch(`${baseUrl}/api/cron/subscription-renew`, {
            method: 'POST', headers,
        });
        results.subscriptionRenew = await res.json();
    } catch (err) {
        results.subscriptionRenew = { error: String(err) };
    }

    // 2. DNS check
    try {
        const res = await fetch(`${baseUrl}/api/cron/dns-check`, {
            method: 'POST', headers,
        });
        results.dnsCheck = await res.json();
    } catch (err) {
        results.dnsCheck = { error: String(err) };
    }

    // 3. Process notifications
    try {
        const res = await fetch(`${baseUrl}/api/cron/process-notifications`, {
            method: 'POST', headers,
        });
        results.notifications = await res.json();
    } catch (err) {
        results.notifications = { error: String(err) };
    }

    return NextResponse.json({
        ok: true,
        runAt: new Date().toISOString(),
        results,
    });
}
