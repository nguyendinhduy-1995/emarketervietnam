import { NextResponse } from 'next/server';

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET() {
    if (!FACEBOOK_APP_ID) {
        return NextResponse.json({ error: 'Facebook OAuth chưa được cấu hình' }, { status: 500 });
    }

    const params = new URLSearchParams({
        client_id: FACEBOOK_APP_ID,
        redirect_uri: `${BASE_URL}/api/auth/facebook/callback`,
        scope: 'email,public_profile',
        response_type: 'code',
    });

    return NextResponse.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
}
