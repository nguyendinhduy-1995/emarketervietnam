import { NextRequest, NextResponse } from 'next/server';
import { handleSocialLogin } from '@/lib/social-auth';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
        return NextResponse.redirect(new URL('/login?error=google_failed', BASE_URL));
    }

    try {
        // Exchange code for tokens
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: `${BASE_URL}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenRes.json();
        if (!tokens.access_token) {
            return NextResponse.redirect(new URL('/login?error=google_token', BASE_URL));
        }

        // Get user info
        const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        const profile = await userRes.json();

        return handleSocialLogin({
            provider: 'google',
            providerAccountId: profile.id,
            name: profile.name || profile.email?.split('@')[0] || 'User',
            email: profile.email,
            avatar: profile.picture,
        });
    } catch (error) {
        console.error('Google OAuth error:', error);
        return NextResponse.redirect(new URL('/login?error=google_error', BASE_URL));
    }
}
