import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET – Danh sách đại lý + thống kê
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const affiliates = await platformDb.affiliateAccount.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            links: true,
            _count: { select: { referrals: true, commissions: true } },
            commissions: {
                select: { amount: true, status: true },
            },
        },
    });

    // Enrich with computed stats
    const enriched = affiliates.map(a => {
        const totalCommission = a.commissions.reduce((s, c) => s + c.amount, 0);
        const pendingCommission = a.commissions.filter(c => c.status === 'PENDING').reduce((s, c) => s + c.amount, 0);
        const paidCommission = a.commissions.filter(c => c.status === 'PAID').reduce((s, c) => s + c.amount, 0);
        const totalClicks = a.links.reduce((s, l) => s + l.clicks, 0);
        return {
            ...a,
            commissions: undefined, // Don't send raw commissions
            stats: {
                totalClicks,
                referrals: a._count.referrals,
                totalCommission,
                pendingCommission,
                paidCommission,
                commissionCount: a._count.commissions,
            },
        };
    });

    // Overview stats
    const overview = {
        totalAffiliates: affiliates.length,
        activeAffiliates: affiliates.filter(a => a.status === 'ACTIVE').length,
        totalClicks: enriched.reduce((s, a) => s + a.stats.totalClicks, 0),
        totalReferrals: enriched.reduce((s, a) => s + a.stats.referrals, 0),
        totalCommission: enriched.reduce((s, a) => s + a.stats.totalCommission, 0),
        pendingPayout: enriched.reduce((s, a) => s + a.stats.pendingCommission, 0),
    };

    return NextResponse.json({ affiliates: enriched, overview });
}

// POST – Thêm đại lý mới
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN', 'OPS']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, email, phone } = body;
    if (!name) return NextResponse.json({ error: 'Tên bắt buộc' }, { status: 400 });

    const affiliate = await platformDb.affiliateAccount.create({
        data: { name, email: email || null, phone: phone || null },
    });

    // Tạo mã giới thiệu tự động
    const refCode = `ref-${name.toLowerCase().replace(/\s+/g, '').slice(0, 6)}-${Date.now().toString(36).slice(-4)}`;
    await platformDb.affiliateLink.create({
        data: { affiliateId: affiliate.id, refCode },
    });

    return NextResponse.json({ affiliate, refCode });
}

// PUT – Cập nhật đại lý
export async function PUT(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN', 'OPS']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, name, email, phone, status } = body;
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const updated = await platformDb.affiliateAccount.update({
        where: { id },
        data: {
            ...(name && { name }),
            ...(email !== undefined && { email: email || null }),
            ...(phone !== undefined && { phone: phone || null }),
            ...(status && { status }),
        },
    });

    return NextResponse.json({ affiliate: updated });
}

// DELETE – Xoá đại lý (soft = set SUSPENDED)
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    await platformDb.affiliateAccount.update({
        where: { id },
        data: { status: 'SUSPENDED' },
    });

    return NextResponse.json({ ok: true });
}
