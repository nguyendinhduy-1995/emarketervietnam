import { NextRequest } from 'next/server';
import { platformDb } from '@/lib/db/platform';

// POST /api/analytics/track – Public endpoint for tracking events from Landing + Hub
// No auth required for page_view/click events (anonymous visitors)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { event, properties = {} } = body;

        if (!event) {
            return Response.json({ error: 'event required' }, { status: 400 });
        }

        // Extract visitor info from headers
        const ua = req.headers.get('user-agent') || '';
        const referer = req.headers.get('referer') || '';
        const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

        // Detect device type from User-Agent
        const isMobile = /Mobile|Android|iPhone|iPad/i.test(ua);
        const isTablet = /iPad|Tablet/i.test(ua);
        const device = isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

        // Detect browser
        let browser = 'other';
        if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'chrome';
        else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'safari';
        else if (/Firefox/i.test(ua)) browser = 'firefox';
        else if (/Edge/i.test(ua)) browser = 'edge';

        await platformDb.eventLog.create({
            data: {
                type: `ANALYTICS:${event.toUpperCase()}`,
                payloadJson: {
                    ...properties,
                    _device: device,
                    _browser: browser,
                    _referer: referer,
                    _ip: ip,
                    _ts: Date.now(),
                },
            },
        });

        return Response.json({ ok: true });
    } catch (error) {
        console.error('[Analytics Track]', error);
        return Response.json({ ok: false }, { status: 500 });
    }
}
