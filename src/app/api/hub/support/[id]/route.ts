import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// GET /api/hub/support/[id] – Get ticket detail with all messages
// POST /api/hub/support/[id] – Add reply message
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const ticket = await platformDb.supportTicket.findFirst({
        where: { id, userId: session.userId },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' },
                include: { author: { select: { name: true } } },
            },
        },
    });

    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });
    return Response.json(ticket);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const { content } = await req.json();
    if (!content?.trim()) return Response.json({ error: 'Nội dung không được trống' }, { status: 400 });

    // Verify ticket belongs to user
    const ticket = await platformDb.supportTicket.findFirst({
        where: { id, userId: session.userId },
    });
    if (!ticket) return Response.json({ error: 'Ticket not found' }, { status: 404 });

    const message = await platformDb.ticketMessage.create({
        data: { ticketId: id, authorId: session.userId, content: content.trim(), isStaff: false },
        include: { author: { select: { name: true } } },
    });

    // Reopen if resolved
    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
        await platformDb.supportTicket.update({ where: { id }, data: { status: 'OPEN' } });
    }

    return Response.json(message, { status: 201 });
}
