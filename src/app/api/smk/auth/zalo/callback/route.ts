import { NextRequest, NextResponse } from 'next/server';
import { handleSocialLogin } from '@/lib/social-auth';

const ZALO_APP_ID = process.env.ZALO_APP_ID || '';
const ZALO_APP_SECRET = process.env.ZALO_APP_SECRET || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) {
        return NextResponse.redirect(new URL('/login?error=zalo_failed', BASE_URL));
    }

    try {
        // Exchange code for token
        const tokenRes = await fetch('https://oauth.zaloapp.com/v4/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'secret_key': ZALO_APP_SECRET,
            },
            body: new URLSearchParams({
                app_id: ZALO_APP_ID,
                code,
                grant_type: 'authorization_code',
            }),
        });

        const tokens = await tokenRes.json();
        if (!tokens.access_token) {
            return NextResponse.redirect(new URL('/login?error=zalo_token', BASE_URL));
        }

        // Get user info
        const userRes = await fetch('https://graph.zalo.me/v2.0/me?fields=id,name,picture', {
            headers: { access_token: tokens.access_token },
        });
        const profile = await userRes.json();

        return handleSocialLogin({
            provider: 'zalo',
            providerAccountId: profile.id,
            name: profile.name || 'Zalo User',
            email: null,
            avatar: profile.picture?.data?.url || null,
        });
    } catch (error) {
        console.error('Zalo OAuth error:', error);
        return NextResponse.redirect(new URL('/login?error=zalo_error', BASE_URL));
    }
}
