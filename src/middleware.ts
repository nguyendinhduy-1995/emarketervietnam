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

    // 2. API Rate Limiting for sensitive public routes
    if (url.pathname === '/api/auth/signup' || url.pathname.startsWith('/api/public/book/')) {
        const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || '127.0.0.1';
        const limit = url.pathname === '/api/auth/signup' ? 50 : 20; // 50 reqs for signup to allow parallel E2E, 20 for booking
        const windowMs = 15 * 60 * 1000; // 15 mins

        if (!checkRateLimit(ip, limit, windowMs)) {
            return NextResponse.json({ error: 'Quá nhiều yêu cầu. Vui lòng thử lại sau.' }, { status: 429 });
        }
    }

    // Normalize localhost by removing port for easy checking
    const baseHostname = hostname.split(':')[0];
    const isCrmSubdomain = baseHostname === 'crmspa.emarketervietnam.vn' || baseHostname === 'crmspa.localhost';

    if (isCrmSubdomain) {
        // If accessing root of subdomain, redirect to main hub
        if (url.pathname === '/') {
            const hubHostname = process.env.NODE_ENV === 'production' ? 'emarketervietnam.vn' : 'localhost';
            const hubPort = process.env.NODE_ENV === 'production' ? '' : ':3000';
            const protocol = process.env.NODE_ENV === 'production' ? 'https://' : 'http://';
            return NextResponse.redirect(`${protocol}${hubHostname}${hubPort}`);
        }

        // Do not rewrite API routes or routes that are already rewritten
        if (url.pathname.startsWith('/api') || url.pathname.startsWith('/crm/')) {
            return NextResponse.next();
        }

        // Map /slug to /crm/slug internally
        url.pathname = `/crm${url.pathname}`;
        return NextResponse.rewrite(url);
    }

    // ─── Tenant Subdomain Injection ─────────────────────────────
    // Pattern: <slug>.emarketervietnam.vn → inject X-Workspace-Slug header
    // The slug will be resolved to workspaceId by the route handler via Prisma
    const baseDomain = process.env.NODE_ENV === 'production' ? 'emarketervietnam.vn' : 'localhost';
    const hostParts = baseHostname.split('.');
    if (hostParts.length > 1 || (process.env.NODE_ENV !== 'production' && baseHostname !== 'localhost')) {
        const potentialSlug = hostParts[0];
        if (potentialSlug && potentialSlug !== 'www' && potentialSlug !== 'crmspa' && potentialSlug !== baseDomain) {
            // Inject tenant slug header for downstream resolution
            const response = NextResponse.next();
            response.headers.set('x-tenant-slug', potentialSlug);
            return response;
        }
    }

    return NextResponse.next();
}
