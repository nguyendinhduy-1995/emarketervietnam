import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const ownerId = url.searchParams.get('ownerId');
    const status = url.searchParams.get('status') || 'OPEN';
    const type = url.searchParams.get('type');

    const tasks = await platformDb.emkTask.findMany({
        where: {
            ...(ownerId ? { ownerId } : {}),
            ...(status === 'ALL' ? {} : { status }),
            ...(type && type !== 'ALL' ? { type } : {}),
        },
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
        include: {
            owner: { select: { name: true } },
            lead: { select: { name: true, phone: true } },
            account: { select: { workspace: { select: { name: true } } } },
        },
    });
    return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { title, type, ownerId, relatedLeadId, relatedAccountId, dueDate } = body;
    if (!title) return NextResponse.json({ error: 'Tiêu đề bắt buộc' }, { status: 400 });

    const task = await platformDb.emkTask.create({
        data: {
            title, type: type || 'GENERAL',
            ownerId: ownerId || auth.user.userId,
            relatedLeadId, relatedAccountId,
            dueDate: dueDate ? new Date(dueDate) : null,
        },
    });
    return NextResponse.json({ task });
}

export async function PATCH(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, ids, status } = body;

    // Bulk complete
    if (ids && Array.isArray(ids)) {
        await platformDb.emkTask.updateMany({
            where: { id: { in: ids } },
            data: { status: status || 'DONE' },
        });
        return NextResponse.json({ ok: true, count: ids.length });
    }

    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const task = await platformDb.emkTask.update({
        where: { id }, data: { status: status || 'DONE' },
    });
    return NextResponse.json({ task });
}
