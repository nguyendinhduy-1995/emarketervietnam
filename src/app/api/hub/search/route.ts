import { NextRequest, NextResponse } from 'next/server';
import { getAuthFromRequest } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/hub/search?q=keyword — Global search across Hub
export async function GET(req: NextRequest) {
    const user = await getAuthFromRequest(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const q = req.nextUrl.searchParams.get('q')?.trim() || '';
    if (!q || q.length < 2) return NextResponse.json({ results: [] });

    const results: Array<{
        type: string;
        title: string;
        subtitle?: string;
        url: string;
        icon: string;
    }> = [];

    // 1. Search pages (static navigation)
    const pages = [
        { title: 'Tổng quan', url: '/hub', icon: '🏠', keywords: 'overview tong quan home' },
        { title: 'Sản phẩm', url: '/hub/marketplace', icon: '🛒', keywords: 'marketplace san pham solution' },
        { title: 'Tài khoản', url: '/hub/account', icon: '👤', keywords: 'account tai khoan profile' },
        { title: 'Thông báo', url: '/hub/notifications', icon: '🔔', keywords: 'notification thong bao' },
        { title: 'Ví', url: '/hub/wallet', icon: '💰', keywords: 'wallet vi tien money' },
        { title: 'Cài đặt', url: '/hub/settings', icon: '⚙️', keywords: 'settings cai dat config' },
        { title: 'Lịch', url: '/hub/calendar', icon: '📅', keywords: 'calendar lich hen' },
        { title: 'Trợ giúp', url: '/hub/help', icon: '📚', keywords: 'help tro giup guide' },
        { title: 'CRM — Tài khoản', url: '/emk-crm/accounts', icon: '🎯', keywords: 'crm account tai khoan hub' },
        { title: 'CRM — Dashboard', url: '/emk-crm/dashboard', icon: '📊', keywords: 'crm dashboard bao cao' },
        { title: 'CRM — Công việc', url: '/emk-crm/tasks', icon: '✅', keywords: 'crm task cong viec' },
        { title: 'CRM — Nội dung CMS', url: '/emk-crm/cms', icon: '📝', keywords: 'crm cms noi dung article' },
    ];

    const qLower = q.toLowerCase();
    for (const page of pages) {
        if (page.title.toLowerCase().includes(qLower) || page.keywords.includes(qLower)) {
            results.push({ type: 'page', title: page.title, url: page.url, icon: page.icon });
        }
    }

    // 2. Search CMS articles
    try {
        const articles = await platformDb.cmsPost.findMany({
            where: {
                status: 'PUBLISHED',
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { excerpt: { contains: q, mode: 'insensitive' } },
                ],
            },
            take: 5,
            select: { id: true, title: true, category: true, slug: true },
        });
        for (const a of articles) {
            results.push({
                type: 'article',
                title: a.title,
                subtitle: a.category || undefined,
                url: `/hub/cms/${a.slug}`,
                icon: '📰',
            });
        }
    } catch { /* table may not exist */ }

    // 3. Search Help Docs
    try {
        const docs = await platformDb.helpDoc.findMany({
            where: {
                title: { contains: q, mode: 'insensitive' },
            },
            take: 5,
            select: { id: true, title: true, moduleKey: true, slug: true },
        });
        for (const d of docs) {
            results.push({
                type: 'help',
                title: d.title,
                subtitle: d.moduleKey || undefined,
                url: `/hub/help#${d.slug || d.id}`,
                icon: '📖',
            });
        }
    } catch { /* table may not exist */ }

    // 4. Search accounts (if user has CRM access)
    try {
        const dbUser = await platformDb.user.findUnique({
            where: { id: user.userId },
            select: { emkRole: true, isAdmin: true },
        });
        if (dbUser?.isAdmin || dbUser?.emkRole) {
            const accounts = await platformDb.emkAccount.findMany({
                where: {
                    workspace: {
                        name: { contains: q, mode: 'insensitive' },
                    },
                },
                take: 5,
                select: { id: true, plan: true, status: true, workspace: { select: { name: true } } },
            });
            for (const a of accounts) {
                results.push({
                    type: 'account',
                    title: a.workspace?.name || 'N/A',
                    subtitle: `${a.plan} · ${a.status}`,
                    url: `/emk-crm/accounts`,
                    icon: '🏢',
                });
            }
        }
    } catch { /* table may not exist */ }

    return NextResponse.json({ results: results.slice(0, 15) });
}
