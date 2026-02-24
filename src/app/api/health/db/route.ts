import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET() {
    try {
        await platformDb.$queryRaw`SELECT 1`;
        return NextResponse.json({ ok: true, db: 'connected' });
    } catch (error) {
        return NextResponse.json({ ok: false, db: 'disconnected' }, { status: 503 });
    }
}
