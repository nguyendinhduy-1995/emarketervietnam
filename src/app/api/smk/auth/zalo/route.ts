import { NextResponse } from 'next/server';

const ZALO_APP_ID = process.env.ZALO_APP_ID || '';
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function GET() {
    if (!ZALO_APP_ID) {
        return NextResponse.json({ error: 'Zalo OAuth chưa được cấu hình' }, { status: 500 });
    }

    const params = new URLSearchParams({
        app_id: ZALO_APP_ID,
        redirect_uri: `${BASE_URL}/api/auth/zalo/callback`,
        state: 'smk_login',
    });

    return NextResponse.redirect(`https://oauth.zaloapp.com/v4/permission?${params}`);
}
