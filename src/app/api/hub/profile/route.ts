import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const dbUser = await platformDb.user.findUnique({
        where: { id: user.userId },
        select: { id: true, name: true, email: true, phone: true, isAdmin: true },
    });

    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(dbUser);
}

export async function PUT(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await req.json();
    const updated = await platformDb.user.update({
        where: { id: user.userId },
        data: {
            ...(body.name !== undefined ? { name: body.name } : {}),
            ...(body.phone !== undefined ? { phone: body.phone } : {}),
        },
        select: { id: true, name: true, email: true, phone: true },
    });

    return NextResponse.json(updated);
}
