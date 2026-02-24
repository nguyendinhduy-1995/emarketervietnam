import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET – Admin: xem tất cả topup intents
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const topups = await platformDb.topupIntent.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
    });

    return NextResponse.json({
        topups: topups.map((t) => ({
            id: t.id, userId: t.userId,
            amount: t.amount, status: t.status,
            transferContent: t.transferContent,
            createdAt: t.createdAt, confirmedAt: t.confirmedAt,
        })),
    });
}

// POST – Admin: manual adjust (credit or debit)
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const { userId, amount, direction, reason } = await req.json();

    if (!userId || !amount || !direction || !reason) {
        return NextResponse.json({ error: 'Thiếu thông tin (userId, amount, direction, reason)' }, { status: 400 });
    }
    if (!['CREDIT', 'DEBIT'].includes(direction)) {
        return NextResponse.json({ error: 'Direction phải là CREDIT hoặc DEBIT' }, { status: 400 });
    }
    if (amount <= 0) {
        return NextResponse.json({ error: 'Số tiền phải > 0' }, { status: 400 });
    }

    const result = await platformDb.$transaction(async (tx) => {
        let wallet = await tx.wallet.findUnique({ where: { userId } });
        if (!wallet) {
            wallet = await tx.wallet.create({ data: { userId } });
        }

        const idempotencyKey = `ADJUST:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

        await tx.walletLedger.create({
            data: {
                walletId: wallet.id, userId,
                type: 'ADJUST', amount, direction,
                refType: 'MANUAL_ADJUST', refId: `admin-${auth.user.userId}`,
                idempotencyKey, note: reason,
                metadata: { adjustedBy: auth.user.userId },
            },
        });

        const credits = await tx.walletLedger.aggregate({
            where: { walletId: wallet.id, direction: 'CREDIT' },
            _sum: { amount: true },
        });
        const debits = await tx.walletLedger.aggregate({
            where: { walletId: wallet.id, direction: 'DEBIT' },
            _sum: { amount: true },
        });
        const newBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

        await tx.wallet.update({ where: { id: wallet.id }, data: { balanceAvailable: newBalance } });
        return { newBalance };
    });

    await platformDb.eventLog.create({
        data: {
            actorUserId: auth.user.userId,
            type: 'WALLET_ADJUSTMENT',
            payloadJson: { userId, amount, direction, reason },
        },
    });

    return NextResponse.json({
        ok: true, newBalance: result.newBalance,
        message: `Điều chỉnh ${direction} ${amount.toLocaleString()}đ thành công`,
    });
}

// PATCH – Admin: xác nhận thủ công 1 topup intent (khi webhook không tự xác nhận)
export async function PATCH(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const { intentId } = await req.json();
    if (!intentId) return NextResponse.json({ error: 'Thiếu intentId' }, { status: 400 });

    const intent = await platformDb.topupIntent.findUnique({ where: { id: intentId } });
    if (!intent) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
    if (intent.status !== 'PENDING') {
        return NextResponse.json({ error: `Trạng thái hiện tại: ${intent.status}, chỉ xác nhận được khi PENDING` }, { status: 400 });
    }

    const userId = intent.userId;
    const idempotencyKey = `ADMIN_CONFIRM:${intentId}`;

    try {
        const result = await platformDb.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) wallet = await tx.wallet.create({ data: { userId } });

            const existing = await tx.walletLedger.findUnique({
                where: { userId_idempotencyKey: { userId, idempotencyKey } },
            });
            if (existing) throw new Error('ALREADY_CREDITED');

            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId,
                    type: 'TOPUP', amount: intent.amount, direction: 'CREDIT',
                    refType: 'TOPUP_CONFIRMED', refId: intent.id,
                    idempotencyKey, note: `Nạp tiền xác nhận thủ công – ${intent.transferContent}`,
                    metadata: { confirmedBy: auth.user.userId },
                },
            });

            const credits = await tx.walletLedger.aggregate({
                where: { walletId: wallet.id, direction: 'CREDIT' }, _sum: { amount: true },
            });
            const debits = await tx.walletLedger.aggregate({
                where: { walletId: wallet.id, direction: 'DEBIT' }, _sum: { amount: true },
            });
            const newBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

            await tx.wallet.update({ where: { id: wallet.id }, data: { balanceAvailable: newBalance } });
            await tx.topupIntent.update({ where: { id: intent.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
            return { newBalance };
        });

        await platformDb.eventLog.create({
            data: {
                actorUserId: auth.user.userId,
                type: 'TOPUP_MANUAL_CONFIRM',
                payloadJson: { intentId, amount: intent.amount, transferContent: intent.transferContent },
            },
        });

        return NextResponse.json({ ok: true, newBalance: result.newBalance, message: `Xác nhận nạp ${intent.amount.toLocaleString()}đ thành công` });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'ALREADY_CREDITED') return NextResponse.json({ error: 'Đã xác nhận trước đó' }, { status: 409 });
        console.error('Admin confirm topup error:', e);
        return NextResponse.json({ error: 'Lỗi xử lý' }, { status: 500 });
    }
}
