import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// GET /api/hub/support – List user's tickets
// POST /api/hub/support – Create new ticket
export async function GET() {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const tickets = await platformDb.supportTicket.findMany({
        where: { userId: session.userId },
        orderBy: { updatedAt: 'desc' },
        include: {
            messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { content: true, isStaff: true, createdAt: true } },
            _count: { select: { messages: true } },
        },
    });

    return Response.json({ tickets });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subject, category, priority, message } = await req.json();
    if (!subject?.trim() || !message?.trim()) {
        return Response.json({ error: 'Thiếu tiêu đề hoặc nội dung' }, { status: 400 });
    }

    const ticket = await platformDb.supportTicket.create({
        data: {
            userId: session.userId,
            subject: subject.trim(),
            category: category || 'GENERAL',
            priority: priority || 'NORMAL',
            messages: {
                create: { authorId: session.userId, content: message.trim(), isStaff: false },
            },
        },
        include: { messages: true },
    });

    return Response.json(ticket, { status: 201 });
}
