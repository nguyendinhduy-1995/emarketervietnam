import { NextResponse } from 'next/server';
import { getCrmSession, clearCrmSessionCookie } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

export async function GET() {
    const session = await getCrmSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await platformDb.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true, name: true, phone: true, isAdmin: true, emkRole: true },
    });

    if (!user) {
        await clearCrmSessionCookie();
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // Double-check CRM access
    if (!user.isAdmin && !user.emkRole) {
        await clearCrmSessionCookie();
        return NextResponse.json({ error: 'No CRM access' }, { status: 403 });
    }

    return NextResponse.json({ user });
}
