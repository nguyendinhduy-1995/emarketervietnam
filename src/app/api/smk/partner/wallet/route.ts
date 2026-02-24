import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/partner/wallet — wallet transactions
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await db.partnerProfile.findUnique({ where: { userId } });
    if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

    const sp = req.nextUrl.searchParams;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = 20;

    const [txs, total, balance] = await Promise.all([
        db.partnerWalletTx.findMany({
            where: { partnerId: partner.id },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.partnerWalletTx.count({ where: { partnerId: partner.id } }),
        db.partnerWalletTx.aggregate({
            where: { partnerId: partner.id },
            _sum: { amount: true },
        }),
    ]);

    // Pending commission (not yet in wallet)
    const pendingAgg = await db.commission.aggregate({
        where: { partnerId: partner.id, status: 'PENDING' },
        _sum: { amount: true },
    });

    // Available commission (ready to withdraw)
    const availableAgg = await db.commission.aggregate({
        where: { partnerId: partner.id, status: 'AVAILABLE' },
        _sum: { amount: true },
    });

    return NextResponse.json({
        balance: balance._sum.amount || 0,
        pending: pendingAgg._sum.amount || 0,
        available: availableAgg._sum.amount || 0,
        transactions: txs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
}

// POST /api/partner/wallet — request payout
export async function POST(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const partner = await db.partnerProfile.findUnique({ where: { userId } });
    if (!partner) return NextResponse.json({ error: 'Not a partner' }, { status: 403 });

    const { amount } = await req.json();
    const MIN_PAYOUT = 100000; // 100K VND
    const MAX_PAYOUT = 50000000; // 50M VND

    if (!amount || amount < MIN_PAYOUT) {
        return NextResponse.json({ error: `Số tiền rút tối thiểu ${MIN_PAYOUT.toLocaleString('vi-VN')}₫` }, { status: 400 });
    }
    // L13: Max payout cap
    if (amount > MAX_PAYOUT) {
        return NextResponse.json({ error: `Số tiền rút tối đa ${MAX_PAYOUT.toLocaleString('vi-VN')}₫/lần` }, { status: 400 });
    }

    // Check available balance
    const available = await db.commission.aggregate({
        where: { partnerId: partner.id, status: 'AVAILABLE' },
        _sum: { amount: true },
    });

    if ((available._sum.amount || 0) < amount) {
        return NextResponse.json({ error: 'Số dư không đủ' }, { status: 400 });
    }

    // Check for pending payout
    const pendingPayout = await db.payoutRequest.findFirst({
        where: { partnerId: partner.id, status: 'REQUESTED' },
    });

    if (pendingPayout) {
        return NextResponse.json({ error: 'Bạn đã có yêu cầu rút tiền đang chờ xử lý' }, { status: 400 });
    }

    const payout = await db.payoutRequest.create({
        data: {
            partnerId: partner.id,
            amount,
            status: 'REQUESTED',
        },
    });

    await db.eventLog.create({
        data: {
            type: 'PAYOUT_REQUESTED',
            userId,
            partnerId: partner.id,
            payload: { amount, payoutId: payout.id },
        },
    });

    return NextResponse.json({ payout }, { status: 201 });
}
