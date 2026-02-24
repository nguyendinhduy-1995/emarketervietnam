import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

interface LayerStats {
    totalPageViews: number;
    uniqueSessions: number;
    avgPagesPerSession: number;
    topPages: Array<{ page: string; views: number; avgScroll: number; uniqueVisitors: number }>;
    ctaClicks: Array<{ text: string; href: string; count: number }>;
    dailyData: Array<{ date: string; views: number }>;
    devices: Record<string, number>;
    browsers: Record<string, number>;
    utmSources: Record<string, number>;
    bounceRate: number;
    avgSessionDuration: number;
}

// GET /api/emk-crm/analytics?days=30&layer=all|landing|hub
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    try {
        const events = await platformDb.eventLog.findMany({
            where: {
                type: { startsWith: 'ANALYTICS:' },
                createdAt: { gte: since },
            },
            select: { type: true, payloadJson: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        // Build layer-separated data
        const layers: Record<string, {
            pageViews: Record<string, number>;
            dailyViews: Record<string, number>;
            sessions: Set<string>;
            devices: Record<string, number>;
            browsers: Record<string, number>;
            utmSources: Record<string, number>;
            ctaMap: Record<string, { text: string; href: string; count: number }>;
            scrollDepths: Record<string, number[]>;
            pageSessionMap: Record<string, Set<string>>;
            sessionPages: Record<string, string[]>;
        }> = {
            landing: { pageViews: {}, dailyViews: {}, sessions: new Set(), devices: {}, browsers: {}, utmSources: {}, ctaMap: {}, scrollDepths: {}, pageSessionMap: {}, sessionPages: {} },
            hub: { pageViews: {}, dailyViews: {}, sessions: new Set(), devices: {}, browsers: {}, utmSources: {}, ctaMap: {}, scrollDepths: {}, pageSessionMap: {}, sessionPages: {} },
        };

        for (const event of events) {
            const payload = event.payloadJson as Record<string, unknown> | null;
            if (!payload) continue;

            const eventType = event.type.replace('ANALYTICS:', '');
            const layer = (payload.layer as string) || 'landing';
            const layerKey = layer === 'hub' ? 'hub' : 'landing';
            const page = (payload.page as string) || '/';
            const dateKey = event.createdAt.toISOString().slice(0, 10);
            const sessionId = (payload.sessionId as string) || '';
            const ld = layers[layerKey];

            // Session tracking
            if (sessionId) {
                ld.sessions.add(sessionId);
                if (!ld.sessionPages[sessionId]) ld.sessionPages[sessionId] = [];
            }

            // Device & browser
            if (payload._device) ld.devices[payload._device as string] = (ld.devices[payload._device as string] || 0) + 1;
            if (payload._browser) ld.browsers[payload._browser as string] = (ld.browsers[payload._browser as string] || 0) + 1;

            // UTM
            if (payload.utm_source) ld.utmSources[payload.utm_source as string] = (ld.utmSources[payload.utm_source as string] || 0) + 1;

            switch (eventType) {
                case 'PAGE_VIEW':
                    ld.pageViews[page] = (ld.pageViews[page] || 0) + 1;
                    ld.dailyViews[dateKey] = (ld.dailyViews[dateKey] || 0) + 1;
                    if (sessionId) {
                        if (!ld.pageSessionMap[page]) ld.pageSessionMap[page] = new Set();
                        ld.pageSessionMap[page].add(sessionId);
                        ld.sessionPages[sessionId]?.push(page);
                    }
                    break;
                case 'CTA_CLICK': {
                    const key = `${payload.text}|${payload.href}`;
                    if (!ld.ctaMap[key]) ld.ctaMap[key] = { text: payload.text as string, href: payload.href as string, count: 0 };
                    ld.ctaMap[key].count++;
                    break;
                }
                case 'SCROLL_DEPTH':
                    if (!ld.scrollDepths[page]) ld.scrollDepths[page] = [];
                    ld.scrollDepths[page].push(payload.depth as number);
                    break;
            }
        }

        // Process each layer into stats
        const processLayer = (ld: typeof layers.landing): LayerStats => {
            const ctaClicks = Object.values(ld.ctaMap).sort((a, b) => b.count - a.count);
            const avgScrollDepth: Record<string, number> = {};
            for (const [page, depths] of Object.entries(ld.scrollDepths)) {
                avgScrollDepth[page] = Math.round(depths.reduce((a, b) => a + b, 0) / depths.length);
            }

            const topPages = Object.entries(ld.pageViews)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 20)
                .map(([page, views]) => ({
                    page, views,
                    avgScroll: avgScrollDepth[page] || 0,
                    uniqueVisitors: ld.pageSessionMap[page]?.size || 0,
                }));

            // Fill daily data
            const dailyData: Array<{ date: string; views: number }> = [];
            for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
                const key = d.toISOString().slice(0, 10);
                dailyData.push({ date: key, views: ld.dailyViews[key] || 0 });
            }

            const totalPV = Object.values(ld.pageViews).reduce((a, b) => a + b, 0);
            const sessionCount = ld.sessions.size;

            // Bounce rate: sessions with only 1 page view
            let bounceSessions = 0;
            for (const pages of Object.values(ld.sessionPages)) {
                if (pages.length <= 1) bounceSessions++;
            }

            return {
                totalPageViews: totalPV,
                uniqueSessions: sessionCount,
                avgPagesPerSession: sessionCount > 0 ? Math.round(totalPV / sessionCount * 10) / 10 : 0,
                topPages,
                ctaClicks: ctaClicks.slice(0, 10),
                dailyData,
                devices: ld.devices,
                browsers: ld.browsers,
                utmSources: ld.utmSources,
                bounceRate: sessionCount > 0 ? Math.round(bounceSessions / sessionCount * 100) : 0,
                avgSessionDuration: 0, // would need session timestamps
            };
        };

        return Response.json({
            period: { days, since: since.toISOString() },
            totalEvents: events.length,
            landing: processLayer(layers.landing),
            hub: processLayer(layers.hub),
        });
    } catch (error) {
        console.error('[CRM Analytics API]', error);
        return Response.json({ error: 'Failed to load analytics' }, { status: 500 });
    }
}
