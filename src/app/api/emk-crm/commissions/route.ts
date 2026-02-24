import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET – Danh sách hoa hồng
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const affiliateId = searchParams.get('affiliateId');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (affiliateId) where.affiliateId = affiliateId;
    if (status) where.status = status;

    const commissions = await platformDb.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
            affiliate: { select: { name: true } },
        },
        take: 100,
    });

    // Tổng hợp
    const all = await platformDb.commission.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
    });

    const pending = await platformDb.commission.aggregate({
        where: { ...where, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
    });

    const approved = await platformDb.commission.aggregate({
        where: { ...where, status: 'APPROVED' },
        _sum: { amount: true },
        _count: true,
    });

    const paid = await platformDb.commission.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { amount: true },
        _count: true,
    });

    return NextResponse.json({
        commissions,
        stats: {
            total: { amount: all._sum.amount || 0, count: all._count },
            pending: { amount: pending._sum.amount || 0, count: pending._count },
            approved: { amount: approved._sum.amount || 0, count: approved._count },
            paid: { amount: paid._sum.amount || 0, count: paid._count },
        },
    });
}

// POST – Tạo hoa hồng mới
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN', 'OPS'] });
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { affiliateId, amount, referralId } = body;
    if (!affiliateId || !amount) {
        return NextResponse.json({ error: 'Cần chọn đại lý và số tiền' }, { status: 400 });
    }

    const commission = await platformDb.commission.create({
        data: {
            affiliateId,
            amount: Math.round(amount),
            referralId: referralId || null,
        },
    });

    return NextResponse.json({ commission });
}

// PUT – Duyệt / từ chối hoa hồng
export async function PUT(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, status, ids } = body;

    // Duyệt hàng loạt
    if (ids && Array.isArray(ids) && status) {
        const data: Record<string, unknown> = { status };
        if (status === 'APPROVED') data.approvedAt = new Date();
        if (status === 'PAID') data.paidAt = new Date();

        await platformDb.commission.updateMany({
            where: { id: { in: ids } },
            data: data as { status: string; approvedAt?: Date; paidAt?: Date },
        });
        return NextResponse.json({ ok: true, count: ids.length });
    }

    // Duyệt đơn lẻ
    if (!id || !status) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

    const data: Record<string, unknown> = { status };
    if (status === 'APPROVED') data.approvedAt = new Date();
    if (status === 'PAID') data.paidAt = new Date();

    const updated = await platformDb.commission.update({
        where: { id },
        data: data as { status: string; approvedAt?: Date; paidAt?: Date },
    });

    return NextResponse.json({ commission: updated });
}
