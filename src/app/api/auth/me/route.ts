import { NextResponse } from 'next/server';
import { getSession, clearSessionCookie } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

export async function GET() {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user with memberships
    const user = await platformDb.user.findUnique({
        where: { id: session.userId },
        include: {
            memberships: {
                include: {
                    workspace: {
                        include: {
                            subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                            productInstances: { take: 1 },
                        },
                    },
                },
            },
        },
    });

    if (!user) {
        await clearSessionCookie();
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            isAdmin: user.isAdmin,
        },
        workspaces: user.memberships.map((m) => ({
            id: m.workspace.id,
            name: m.workspace.name,
            slug: m.workspace.slug,
            role: m.role,
            status: m.workspace.status,
            subscription: m.workspace.subscriptions[0] || null,
            instance: m.workspace.productInstances[0] || null,
        })),
    });
}

export async function DELETE() {
    await clearSessionCookie();
    return NextResponse.json({ success: true });
}
