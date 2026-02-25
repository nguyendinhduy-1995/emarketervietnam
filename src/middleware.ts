import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

// Simple in-memory rate limiter per Edge isolate
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, maxReqs: number, windowMs: number): boolean {
    const now = Date.now();
    const current = rateLimitMap.get(ip);

    if (!current || now > current.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }
    if (current.count >= maxReqs) return false;
    current.count++;
    return true;
}

export function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();
    const hostname = req.headers.get('host') || '';

    // 1. CSRF Protection for mutating API requests (skip webhooks)
    if (url.pathname.startsWith('/api/') && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        if (!url.pathname.startsWith('/api/webhooks/')) {
            const origin = req.headers.get('origin');
            if (origin) {
                try {
                    const originHost = new URL(origin).host;
                    const isLocal = originHost.includes('localhost') || originHost.includes('127.0.0.1');
                    if (originHost !== hostname && !isLocal) {
                        return NextResponse.json({ error: 'Invalid Origin (CSRF)' }, { status: 403 });
                    }
                } catch {
                    return NextResponse.json({ error: 'Malformed Origin (CSRF)' }, { status: 400 });
                }
            }
        }
    }

    // 2. API Rate Limiting for sensitive routes
    const sensitiveRoutes: Array<{ pattern: string; limit: number; windowMs: number }> = [
        { pattern: '/api/auth/signup', limit: 50, windowMs: 15 * 60_000 },
        { pattern: '/api/public/book/', limit: 20, windowMs: 15 * 60_000 },
        { pattern: '/api/hub/usage/charge', limit: 10, windowMs: 60_000 },
        { pattern: '/api/hub/usage/complete', limit: 10, windowMs: 60_000 },
        { pattern: '/api/hub/dns/init', limit: 5, windowMs: 60_000 },
        { pattern: '/api/hub/dns/verify', limit: 10, windowMs: 60_000 },
        { pattern: '/api/hub/deploy/enqueue', limit: 3, windowMs: 60_000 },
        { pattern: '/api/hub/checkout', limit: 10, windowMs: 60_000 },
        { pattern: '/api/hub/launch', limit: 20, windowMs: 60_000 },
        { pattern: '/api/auth/login', limit: 20, windowMs: 15 * 60_000 },
    ];

    const matchedRoute = sensitiveRoutes.find(r =>
        url.pathname === r.pattern || url.pathname.startsWith(r.pattern)
    );
    if (matchedRoute) {
        const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '127.0.0.1';
        if (!checkRateLimit(ip, matchedRoute.limit, matchedRoute.windowMs)) {
            return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 });
        }
    }

    // Normalize localhost by removing port for easy checking
    const baseHostname = hostname.split(':')[0];
    const isCrmSubdomain = baseHostname === 'crmspa.emarketervietnam.vn' || baseHostname === 'crmspa.localhost'
        || baseHostname === 'crm.emarketervietnam.vn' || baseHostname === 'crm.localhost';
    const isHubSubdomain = baseHostname === 'hub.emarketervietnam.vn' || baseHostname === 'hub.localhost';

    // Hub subdomain — passes through as if it were the main domain
    if (isHubSubdomain) {
        return NextResponse.next();
    }

    if (isCrmSubdomain) {
        // If accessing root of subdomain, show CRM login
        if (url.pathname === '/') {
            url.pathname = '/emk-crm/login';
            return NextResponse.rewrite(url);
        }

        // Do not rewrite API routes or routes that already have the /emk-crm prefix
        if (url.pathname.startsWith('/api') || url.pathname === '/emk-crm' || url.pathname.startsWith('/emk-crm/')) {
            return NextResponse.next();
        }

        // Map /slug to /emk-crm/slug internally
        url.pathname = `/emk-crm${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // ─── Tenant Subdomain Injection ─────────────────────────────
    // Pattern: <slug>.emarketervietnam.vn → inject X-Workspace-Slug header
    // The slug will be resolved to workspaceId by the route handler via Prisma
    const baseDomain = process.env.NODE_ENV === 'production' ? 'emarketervietnam.vn' : 'localhost';
    const hostParts = baseHostname.split('.');
    const reservedSubdomains = ['www', 'crmspa', 'crm', 'hub'];
    if (hostParts.length > 1 || (process.env.NODE_ENV !== 'production' && baseHostname !== 'localhost')) {
        const potentialSlug = hostParts[0];
        if (potentialSlug && !reservedSubdomains.includes(potentialSlug) && potentialSlug !== baseDomain) {
            // Inject tenant slug header for downstream resolution
            const response = NextResponse.next();
            response.headers.set('x-tenant-slug', potentialSlug);
            return response;
        }
    }

    return NextResponse.next();
}
