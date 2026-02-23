import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';

export async function GET(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = 20;

    const where = search
        ? {
            OR: [
                { name: { contains: search, mode: 'insensitive' as const } },
                { slug: { contains: search, mode: 'insensitive' as const } },
                {
                    org: {
                        owner: {
                            OR: [
                                { email: { contains: search, mode: 'insensitive' as const } },
                                { phone: { contains: search, mode: 'insensitive' as const } },
                            ],
                        },
                    },
                },
            ],
        }
        : {};

    const [workspaces, total] = await Promise.all([
        platformDb.workspace.findMany({
            where,
            include: {
                org: {
                    include: {
                        owner: {
                            select: { id: true, email: true, name: true, phone: true },
                        },
                    },
                },
                subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
                productInstances: { take: 1 },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        platformDb.workspace.count({ where }),
    ]);

    return NextResponse.json({
        workspaces,
        total,
        page,
        totalPages: Math.ceil(total / limit),
    });
}

// Admin actions: suspend, unsuspend, extend trial, reset password
export async function POST(req: NextRequest) {
    const authResult = await requireAdmin(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { action, workspaceId, userId, days } = body;

    switch (action) {
        case 'suspend':
            await platformDb.workspace.update({
                where: { id: workspaceId },
                data: { status: 'SUSPENDED' },
            });
            await platformDb.subscription.updateMany({
                where: { workspaceId },
                data: { status: 'SUSPENDED' },
            });
            return NextResponse.json({ success: true, message: 'Workspace suspended' });

        case 'unsuspend':
            await platformDb.workspace.update({
                where: { id: workspaceId },
                data: { status: 'ACTIVE' },
            });
            await platformDb.subscription.updateMany({
                where: { workspaceId, status: 'SUSPENDED' },
                data: { status: 'ACTIVE' },
            });
            return NextResponse.json({ success: true, message: 'Workspace unsuspended' });

        case 'extend_trial': {
            const sub = await platformDb.subscription.findFirst({
                where: { workspaceId },
                orderBy: { createdAt: 'desc' },
            });
            if (sub) {
                const current = sub.currentPeriodEnd || new Date();
                const newEnd = new Date(current);
                newEnd.setDate(newEnd.getDate() + (days || 14));
                await platformDb.subscription.update({
                    where: { id: sub.id },
                    data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
                });
            }
            return NextResponse.json({ success: true, message: `Trial extended by ${days || 14} days` });
        }

        case 'reset_password': {
            if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });
            const newPwd = Math.random().toString(36).substring(2, 12);
            await platformDb.user.update({
                where: { id: userId },
                data: { passwordHash: await hashPassword(newPwd) },
            });
            return NextResponse.json({ success: true, tempPassword: newPwd });
        }

        default:
            return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
}
