import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// GET – Số dư + lịch sử giao dịch + pending topup
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const userId = session.userId;

    // Tìm hoặc tạo ví
    let wallet = await platformDb.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        wallet = await platformDb.wallet.create({ data: { userId } });
    }

    // Lịch sử giao dịch (20 mới nhất)
    const ledger = await platformDb.walletLedger.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 20,
    });

    // TopupIntent đang chờ
    const pendingTopups = await platformDb.topupIntent.findMany({
        where: { userId, status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 3,
    });

    // Tính balance thực từ ledger (source of truth)
    const credits = await platformDb.walletLedger.aggregate({
        where: { walletId: wallet.id, direction: 'CREDIT' },
        _sum: { amount: true },
    });
    const debits = await platformDb.walletLedger.aggregate({
        where: { walletId: wallet.id, direction: 'DEBIT' },
        _sum: { amount: true },
    });
    const realBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

    // Sync cache nếu lệch
    if (wallet.balanceAvailable !== realBalance) {
        await platformDb.wallet.update({
            where: { id: wallet.id },
            data: { balanceAvailable: realBalance },
        });
    }

    return NextResponse.json({
        walletId: wallet.id,
        balance: realBalance,
        currency: wallet.currency,
        ledger: ledger.map((l) => ({
            id: l.id, type: l.type, amount: l.amount,
            direction: l.direction, refType: l.refType,
            note: l.note, createdAt: l.createdAt,
        })),
        pendingTopups: pendingTopups.map((t) => ({
            id: t.id, amount: t.amount, status: t.status,
            transferContent: t.transferContent, qrPayload: t.qrPayload,
            expiresAt: t.expiresAt, createdAt: t.createdAt,
        })),
    });
}
