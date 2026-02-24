import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const DATA_DIR = join(process.cwd(), '.analytics');
const VISITS_FILE = join(DATA_DIR, 'visits.json');
const BEHAVIOR_FILE = join(DATA_DIR, 'behavior.json');

interface VisitData {
    date: string;
    views: number;
    uniqueSessions: string[];
    topPages: Record<string, number>;
    topActions: Record<string, number>;
    hourlyViews: number[];
}

interface BehaviorSummary {
    sessions: Record<string, {
        lastSeen: number;
        pageCount: number;
        productViewCount: number;
        actionCount: number;
        visitCount: number;
        lastPath: string;
        categories: string[];
        priceRange: { min: number; max: number; avg: number } | null;
        lastProducts: string[];
    }>;
}

async function ensureDir() {
    try { await mkdir(DATA_DIR, { recursive: true }); } catch { /* exists */ }
}

async function readJson<T>(path: string, fallback: T): Promise<T> {
    try {
        const raw = await readFile(path, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

// POST — receive tracking data
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sessionId, pageCount, productViewCount, actionCount, visitCount, currentPath, lastProducts, categories, priceRange, actions } = body;

        await ensureDir();

        const today = new Date().toISOString().slice(0, 10);
        const hour = new Date().getHours();

        // Update visits
        const visits = await readJson<Record<string, VisitData>>(VISITS_FILE, {});
        if (!visits[today]) {
            visits[today] = { date: today, views: 0, uniqueSessions: [], topPages: {}, topActions: {}, hourlyViews: new Array(24).fill(0) };
        }
        const dayData = visits[today];
        dayData.views++;
        dayData.hourlyViews[hour] = (dayData.hourlyViews[hour] || 0) + 1;
        if (!dayData.uniqueSessions.includes(sessionId)) {
            dayData.uniqueSessions.push(sessionId);
        }
        if (currentPath) {
            dayData.topPages[currentPath] = (dayData.topPages[currentPath] || 0) + 1;
        }
        if (actions && Array.isArray(actions)) {
            for (const a of actions) {
                const key = `${a.type}:${a.target}`;
                dayData.topActions[key] = (dayData.topActions[key] || 0) + 1;
            }
        }

        // Keep only last 30 days
        const dates = Object.keys(visits).sort();
        if (dates.length > 30) {
            for (const d of dates.slice(0, dates.length - 30)) delete visits[d];
        }
        await writeFile(VISITS_FILE, JSON.stringify(visits, null, 2));

        // Update behavior
        const behavior = await readJson<BehaviorSummary>(BEHAVIOR_FILE, { sessions: {} });
        behavior.sessions[sessionId] = {
            lastSeen: Date.now(),
            pageCount: pageCount || 0,
            productViewCount: productViewCount || 0,
            actionCount: actionCount || 0,
            visitCount: visitCount || 0,
            lastPath: currentPath || '/',
            categories: categories || [],
            priceRange: priceRange || null,
            lastProducts: lastProducts || [],
        };

        // Clean old sessions (>7 days)
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        for (const [sid, session] of Object.entries(behavior.sessions)) {
            if (session.lastSeen < weekAgo) delete behavior.sessions[sid];
        }
        await writeFile(BEHAVIOR_FILE, JSON.stringify(behavior, null, 2));

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('Analytics track error:', err);
        return NextResponse.json({ ok: false }, { status: 500 });
    }
}

// GET — retrieve analytics summary for admin dashboard
export async function GET() {
    try {
        await ensureDir();
        const visits = await readJson<Record<string, VisitData>>(VISITS_FILE, {});
        const behavior = await readJson<BehaviorSummary>(BEHAVIOR_FILE, { sessions: {} });

        const today = new Date().toISOString().slice(0, 10);
        const todayData = visits[today] || { views: 0, uniqueSessions: [], topPages: {}, topActions: {}, hourlyViews: new Array(24).fill(0) };

        // Last 7 days
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
            last7Days.push({
                date: key,
                day: dayNames[d.getDay()],
                views: visits[key]?.views || 0,
                unique: visits[key]?.uniqueSessions.length || 0,
            });
        }

        // Active sessions (last 30 min)
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        const activeSessions = Object.values(behavior.sessions).filter(s => s.lastSeen > thirtyMinAgo).length;

        // Top pages today
        const topPages = Object.entries(todayData.topPages)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([path, views]) => ({ path, views }));

        // Top actions
        const topActions = Object.entries(todayData.topActions)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([action, count]) => ({ action, count }));

        // Category interest
        const categoryInterest: Record<string, number> = {};
        for (const session of Object.values(behavior.sessions)) {
            for (const cat of session.categories) {
                categoryInterest[cat] = (categoryInterest[cat] || 0) + 1;
            }
        }

        // Price range analysis
        const priceRanges = Object.values(behavior.sessions)
            .filter(s => s.priceRange)
            .map(s => s.priceRange!);
        const avgPrice = priceRanges.length > 0
            ? Math.round(priceRanges.reduce((s, p) => s + p.avg, 0) / priceRanges.length)
            : 0;

        // AI Insights
        const insights: string[] = [];
        const totalViews = todayData.views;
        const uniqueVisitors = todayData.uniqueSessions.length;

        if (uniqueVisitors > 0) {
            const pagesPerVisit = (totalViews / uniqueVisitors).toFixed(1);
            insights.push(`Trung bình ${pagesPerVisit} trang/phiên truy cập`);
        }

        const peakHour = todayData.hourlyViews.indexOf(Math.max(...todayData.hourlyViews));
        if (todayData.hourlyViews[peakHour] > 0) {
            insights.push(`Giờ cao điểm: ${peakHour}:00 - ${peakHour + 1}:00 (${todayData.hourlyViews[peakHour]} lượt)`);
        }

        if (avgPrice > 0) {
            insights.push(`Ngân sách trung bình khách hàng quan tâm: ${new Intl.NumberFormat('vi-VN').format(avgPrice)}₫`);
        }

        const topCat = Object.entries(categoryInterest).sort(([, a], [, b]) => b - a)[0];
        if (topCat) {
            insights.push(`Danh mục được quan tâm nhất: ${topCat[0]} (${topCat[1]} phiên)`);
        }

        // Engagement suggestion
        const productViewers = Object.values(behavior.sessions).filter(s => s.productViewCount > 3).length;
        const totalSessions = Object.keys(behavior.sessions).length;
        if (totalSessions > 0) {
            const engageRate = ((productViewers / totalSessions) * 100).toFixed(0);
            insights.push(`${engageRate}% khách hàng xem >3 sản phẩm → Tỉ lệ tương tác tốt`);
        }

        return NextResponse.json({
            today: {
                views: totalViews,
                uniqueVisitors,
                activeSessions,
                topPages,
                topActions,
                hourlyViews: todayData.hourlyViews,
            },
            last7Days,
            behavior: {
                totalSessions: Object.keys(behavior.sessions).length,
                categoryInterest,
                avgPrice,
            },
            aiInsights: insights,
        });
    } catch (err) {
        console.error('Analytics GET error:', err);
        return NextResponse.json({ today: { views: 0, uniqueVisitors: 0, activeSessions: 0, topPages: [], topActions: [], hourlyViews: [] }, last7Days: [], behavior: { totalSessions: 0, categoryInterest: {}, avgPrice: 0 }, aiInsights: [] });
    }
}
