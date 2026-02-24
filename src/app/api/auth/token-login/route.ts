import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { signToken } from '@/lib/auth/jwt';
import { setSessionCookie } from '@/lib/auth/jwt';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    const user = await platformDb.user.findUnique({
        where: { loginToken: token },
    });

    if (!user || !user.loginTokenExpiry || user.loginTokenExpiry < new Date()) {
        return NextResponse.redirect(new URL('/login?error=token_expired', req.url));
    }

    // Clear token (one-time use)
    await platformDb.user.update({
        where: { id: user.id },
        data: { loginToken: null, loginTokenExpiry: null },
    });

    // Set session
    const jwt = await signToken({
        userId: user.id,
        email: user.email || user.phone,
        name: user.name,
        isAdmin: user.isAdmin,
    });
    await setSessionCookie(jwt);

    // Log login event
    await platformDb.eventLog.create({
        data: { actorUserId: user.id, type: 'LOGIN', payloadJson: { method: 'magic_link' } },
    });

    // Check if user has completed onboarding
    const membership = await platformDb.membership.findFirst({
        where: { userId: user.id },
    });

    if (membership) {
        return NextResponse.redirect(new URL('/hub', req.url));
    } else {
        return NextResponse.redirect(new URL('/hub/onboarding', req.url));
    }
}
