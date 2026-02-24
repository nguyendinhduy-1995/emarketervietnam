import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET – Danh sách đợt chi trả
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const batches = await platformDb.payoutBatch.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            items: {
                include: {
                    batch: false,
                },
            },
        },
    });

    // Enrich items with affiliate names
    const affiliateIds = [...new Set(batches.flatMap(b => b.items.map(i => i.affiliateId)))];
    const affiliates = await platformDb.affiliateAccount.findMany({
        where: { id: { in: affiliateIds } },
        select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(affiliates.map(a => [a.id, a.name]));

    const enriched = batches.map(b => ({
        ...b,
        items: b.items.map(i => ({ ...i, affiliateName: nameMap[i.affiliateId] || 'Không rõ' })),
    }));

    return NextResponse.json({ batches: enriched });
}

// POST – Tạo đợt chi trả mới từ hoa hồng đã duyệt
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const month = body.month || new Date().toISOString().slice(0, 7);

    // Tìm hoa hồng APPROVED chưa được chi trả
    const approvedCommissions = await platformDb.commission.findMany({
        where: { status: 'APPROVED' },
    });

    if (approvedCommissions.length === 0) {
        return NextResponse.json({ error: 'Không có hoa hồng đã duyệt để chi trả' }, { status: 400 });
    }

    // Nhóm theo đại lý
    const byAffiliate = new Map<string, number>();
    for (const c of approvedCommissions) {
        byAffiliate.set(c.affiliateId, (byAffiliate.get(c.affiliateId) || 0) + c.amount);
    }

    const total = approvedCommissions.reduce((s, c) => s + c.amount, 0);

    // Tạo batch + items trong transaction
    const batch = await platformDb.$transaction(async (tx) => {
        const b = await tx.payoutBatch.create({
            data: {
                month,
                total,
                note: body.note || null,
            },
        });

        for (const [affiliateId, amount] of byAffiliate.entries()) {
            await tx.payoutItem.create({
                data: { batchId: b.id, affiliateId, amount },
            });
        }

        // Cập nhật trạng thái commission → PAID
        await tx.commission.updateMany({
            where: { id: { in: approvedCommissions.map(c => c.id) } },
            data: { status: 'PAID', paidAt: new Date() },
        });

        return await tx.payoutBatch.findUnique({
            where: { id: b.id },
            include: { items: true },
        });
    });

    return NextResponse.json({ batch });
}

// PUT – Cập nhật trạng thái đợt chi trả
export async function PUT(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, status, itemId, proofUrl } = body;

    // Cập nhật item (đánh dấu đã trả + upload bằng chứng)
    if (itemId) {
        const updated = await platformDb.payoutItem.update({
            where: { id: itemId },
            data: {
                ...(status && { status }),
                ...(proofUrl !== undefined && { proofUrl }),
            },
        });
        return NextResponse.json({ item: updated });
    }

    // Cập nhật batch status
    if (!id || !status) return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });

    const batch = await platformDb.payoutBatch.update({
        where: { id },
        data: { status },
    });

    // Nếu đánh dấu PAID, cập nhật tất cả items
    if (status === 'PAID') {
        await platformDb.payoutItem.updateMany({
            where: { batchId: id },
            data: { status: 'PAID' },
        });
    }

    return NextResponse.json({ batch });
}
