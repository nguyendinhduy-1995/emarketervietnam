import { NextRequest, NextResponse } from 'next/server';
import { handleSocialLogin } from '@/lib/social-auth';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
        return NextResponse.redirect(new URL('/login?error=facebook_failed', BASE_URL));
    }

    try {
        // Exchange code for token
        const tokenParams = new URLSearchParams({
            client_id: FACEBOOK_APP_ID,
            client_secret: FACEBOOK_APP_SECRET,
            redirect_uri: `${BASE_URL}/api/auth/facebook/callback`,
            code,
        });

        const tokenRes = await fetch(`https://graph.facebook.com/v19.0/oauth/access_token?${tokenParams}`);
        const tokens = await tokenRes.json();
        if (!tokens.access_token) {
            return NextResponse.redirect(new URL('/login?error=facebook_token', BASE_URL));
        }

        // Get user info
        const userRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${tokens.access_token}`);
        const profile = await userRes.json();

        return handleSocialLogin({
            provider: 'facebook',
            providerAccountId: profile.id,
            name: profile.name || 'User',
            email: profile.email || null,
            avatar: profile.picture?.data?.url || null,
        });
    } catch (error) {
        console.error('Facebook OAuth error:', error);
        return NextResponse.redirect(new URL('/login?error=facebook_error', BASE_URL));
    }
}
