import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * GET /api/launch?token=xxx
 *
 * SSO endpoint: user clicks "Mở App" on Hub → redirected here.
 * Verifies launch token with Hub, creates local session.
 */
export async function GET(req: NextRequest) {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login?error=missing_token', req.url));
    }

    const hubUrl = process.env.HUB_URL || 'http://localhost:3000';

    try {
        // 1. Verify launch token with Hub
        const verifyRes = await fetch(`${hubUrl}/api/hub/launch/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
        });

        if (!verifyRes.ok) {
            console.error('[LAUNCH] Hub verify failed:', verifyRes.status);
            return NextResponse.redirect(new URL('/login?error=invalid_token', req.url));
        }

        const payload = await verifyRes.json();
        if (!payload.valid && !payload.userId) {
            return NextResponse.redirect(new URL('/login?error=expired_token', req.url));
        }

        // 2. Create session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionData = {
            userId: payload.userId,
            userName: payload.userName,
            email: payload.email,
            workspaceId: payload.workspaceId,
            entitlements: payload.entitlements || [],
            createdAt: new Date().toISOString(),
        };

        // 3. Store session in cookie (signed)
        const cookieStore = await cookies();
        cookieStore.set('estudio_session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60, // 24 hours
        });
        cookieStore.set('estudio_token', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 24 * 60 * 60,
        });

        console.log(`[LAUNCH] User ${payload.userName} (${payload.email}) logged in via Hub SSO`);

        // 4. Redirect to dashboard
        return NextResponse.redirect(new URL('/', req.url));
    } catch (err) {
        console.error('[LAUNCH] Error:', err);
        return NextResponse.redirect(new URL('/login?error=connection_failed', req.url));
    }
}
