import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/partners — list all partners
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(50, Number(sp.get('limit')) || 20);
    const status = sp.get('status') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [partners, total] = await Promise.all([
        db.partnerProfile.findMany({
            where,
            include: {
                user: { select: { name: true, phone: true, email: true } },
                _count: { select: { referrals: true, commissions: true } },
                riskSignal: true,
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.partnerProfile.count({ where }),
    ]);

    return NextResponse.json({ partners, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// PATCH /api/smk/admin/partners — approve/suspend partner
export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const { partnerId, action, note } = await req.json();

    if (!partnerId || !action) {
        return NextResponse.json({ error: 'partnerId and action required' }, { status: 400 });
    }

    const statusMap: Record<string, string> = {
        approve: 'ACTIVE',
        suspend: 'SUSPENDED',
        reactivate: 'ACTIVE',
    };

    const newStatus = statusMap[action];
    if (!newStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    await db.partnerProfile.update({
        where: { id: partnerId },
        data: { status: newStatus as 'ACTIVE' | 'SUSPENDED' | 'PENDING' },
    });

    await db.eventLog.create({
        data: {
            type: action === 'approve' ? 'PARTNER_APPROVED' : action === 'suspend' ? 'PARTNER_SUSPENDED' : 'PARTNER_REACTIVATED',
            partnerId,
            payload: { action, note },
        },
    });

    return NextResponse.json({ ok: true });
}
