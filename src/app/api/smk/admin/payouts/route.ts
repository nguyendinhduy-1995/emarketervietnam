import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/payouts — list payout requests
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const sp = req.nextUrl.searchParams;
    const status = sp.get('status') || 'REQUESTED';
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = 20;

    const [payouts, total] = await Promise.all([
        db.payoutRequest.findMany({
            where: { status: status as 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED' },
            include: {
                partner: {
                    select: {
                        partnerCode: true,
                        level: true,
                        bankAccount: true,
                        user: { select: { name: true, phone: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.payoutRequest.count({ where: { status: status as 'REQUESTED' } }),
    ]);

    return NextResponse.json({ payouts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

// PATCH /api/smk/admin/payouts — approve or reject payout
export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const { payoutId, action, note, transactionRef } = await req.json();

    if (!payoutId || !action) {
        return NextResponse.json({ error: 'payoutId and action required' }, { status: 400 });
    }

    const payout = await db.payoutRequest.findUnique({
        where: { id: payoutId },
        include: { partner: { select: { id: true } } },
    });

    if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 });

    if (action === 'approve') {
        await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
            await tx.payoutRequest.update({
                where: { id: payoutId },
                data: { status: 'APPROVED', note },
            });
        });
    } else if (action === 'pay') {
        await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
            await tx.payoutRequest.update({
                where: { id: payoutId },
                data: { status: 'PAID', note, paidAt: new Date() },
            });

            // Deduct from wallet
            const walletBalance = await tx.partnerWalletTx.aggregate({
                where: { partnerId: payout.partner.id },
                _sum: { amount: true },
            });

            await tx.partnerWalletTx.create({
                data: {
                    partnerId: payout.partner.id,
                    type: 'PAYOUT',
                    amount: -payout.amount,
                    refId: payoutId,
                    balanceAfter: (walletBalance._sum.amount || 0) - payout.amount,
                },
            });

            // Mark related commissions as PAID
            await tx.commission.updateMany({
                where: { partnerId: payout.partner.id, status: 'AVAILABLE' },
                data: { status: 'PAID' },
            });

            await tx.eventLog.create({
                data: {
                    type: 'PAYOUT_PAID',
                    partnerId: payout.partner.id,
                    payload: { amount: payout.amount, transactionRef },
                },
            });
        });
    } else if (action === 'reject') {
        await db.payoutRequest.update({
            where: { id: payoutId },
            data: { status: 'REJECTED', note },
        });
    }

    return NextResponse.json({ ok: true });
}
