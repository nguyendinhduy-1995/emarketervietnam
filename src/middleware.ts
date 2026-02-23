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

export function middleware(req: NextRequest) {
    const url = req.nextUrl.clone();

    // Get hostname (e.g. crmspa.emarketervietnam.vn, localhost:3000)
    let hostname = req.headers.get('host')!;

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

    return NextResponse.next();
}
