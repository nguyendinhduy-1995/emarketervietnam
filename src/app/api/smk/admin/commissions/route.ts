import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/commissions — list all commissions
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = Math.min(50, Number(sp.get('limit')) || 20);
    const status = sp.get('status') || undefined;
    const partnerId = sp.get('partnerId') || undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (partnerId) where.partnerId = partnerId;

    const [commissions, total, summary] = await Promise.all([
        db.commission.findMany({
            where,
            include: {
                partner: {
                    select: { partnerCode: true, level: true, user: { select: { name: true } } },
                },
                order: {
                    select: { code: true, total: true, status: true, createdAt: true },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.commission.count({ where }),
        // Aggregate summary
        db.commission.groupBy({
            by: ['status'],
            _sum: { amount: true },
            _count: true,
        }),
    ]);

    const summaryMap = Object.fromEntries(
        summary.map((s: { status: string; _sum: { amount: number | null }; _count: number }) => [s.status, { total: s._sum.amount || 0, count: s._count }])
    );

    return NextResponse.json({
        commissions,
        summary: summaryMap,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

// PATCH /api/smk/admin/commissions — manually release or reverse a commission
export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const { commissionId, action, note } = await req.json();

    if (!commissionId || !action) {
        return NextResponse.json({ error: 'commissionId and action required' }, { status: 400 });
    }

    const commission = await db.commission.findUnique({
        where: { id: commissionId },
        include: { partner: { select: { id: true } } },
    });

    if (!commission) return NextResponse.json({ error: 'Commission not found' }, { status: 404 });

    if (action === 'release') {
        if (commission.status !== 'PENDING') {
            return NextResponse.json({ error: 'Only PENDING commissions can be released' }, { status: 400 });
        }

        await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
            // Update commission status
            await tx.commission.update({
                where: { id: commissionId },
                data: { status: 'AVAILABLE' },
            });

            // Calculate current wallet balance
            const walletAgg = await tx.partnerWalletTx.aggregate({
                where: { partnerId: commission.partnerId },
                _sum: { amount: true },
            });
            const currentBalance = walletAgg._sum.amount || 0;

            // Create wallet EARN transaction
            await tx.partnerWalletTx.create({
                data: {
                    partnerId: commission.partnerId,
                    type: 'EARN',
                    amount: commission.amount,
                    refId: commissionId,
                    balanceAfter: currentBalance + commission.amount,
                    note: note || `Hoa hồng đơn ${commission.orderId}`,
                },
            });

            await tx.eventLog.create({
                data: {
                    type: 'COMMISSION_AVAILABLE',
                    partnerId: commission.partnerId,
                    orderId: commission.orderId,
                    payload: { amount: commission.amount, commissionId, note },
                },
            });
        });
    } else if (action === 'reverse') {
        if (!['PENDING', 'AVAILABLE'].includes(commission.status)) {
            return NextResponse.json({ error: 'Cannot reverse PAID or already REVERSED commission' }, { status: 400 });
        }

        await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
            const prevStatus = commission.status;
            await tx.commission.update({ where: { id: commissionId }, data: { status: 'REVERSED' } });

            // If was AVAILABLE, deduct from wallet
            if (prevStatus === 'AVAILABLE') {
                const walletAgg = await tx.partnerWalletTx.aggregate({
                    where: { partnerId: commission.partnerId },
                    _sum: { amount: true },
                });
                const currentBalance = walletAgg._sum.amount || 0;

                await tx.partnerWalletTx.create({
                    data: {
                        partnerId: commission.partnerId,
                        type: 'REVERSE',
                        amount: -commission.amount,
                        refId: commissionId,
                        balanceAfter: currentBalance - commission.amount,
                        note: note || `Hoàn hoa hồng`,
                    },
                });
            }

            await tx.eventLog.create({
                data: {
                    type: 'COMMISSION_REVERSED',
                    partnerId: commission.partnerId,
                    orderId: commission.orderId,
                    payload: { amount: commission.amount, commissionId, note, prevStatus },
                },
            });
        });
    } else {
        return NextResponse.json({ error: 'Invalid action. Use "release" or "reverse".' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
}
