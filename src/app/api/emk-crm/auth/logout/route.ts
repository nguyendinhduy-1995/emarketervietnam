import { NextResponse } from 'next/server';
import { clearCrmSessionCookie } from '@/lib/auth/jwt';

export async function POST() {
    await clearCrmSessionCookie();
    return NextResponse.json({ success: true });
}
