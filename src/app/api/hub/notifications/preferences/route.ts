import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// GET /api/hub/notifications/preferences – Get user's notification preferences
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let settings = await platformDb.userSetting.findUnique({ where: { userId: session.userId } });
    if (!settings) {
        settings = await platformDb.userSetting.create({ data: { userId: session.userId } });
    }

    return NextResponse.json({
        preferences: {
            notifBilling: settings.notifBilling,
            notifTask: settings.notifTask,
            notifSystem: settings.notifSystem,
            notifUpdate: settings.notifUpdate,
            notifPromo: settings.notifPromo,
            digestMode: settings.digestMode,
            quietStart: settings.quietStart,
            quietEnd: settings.quietEnd,
        },
    });
}

// PATCH /api/hub/notifications/preferences – Update notification preferences
export async function PATCH(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const allowed = ['notifBilling', 'notifTask', 'notifSystem', 'notifUpdate', 'notifPromo', 'digestMode', 'quietStart', 'quietEnd'];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
        if (key in body) data[key] = body[key];
    }

    const settings = await platformDb.userSetting.upsert({
        where: { userId: session.userId },
        update: data,
        create: { userId: session.userId, ...data },
    });

    return NextResponse.json({ ok: true, preferences: settings });
}
