import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// POST – Mua bằng ví (atomic debit)
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const userId = session.userId;
    const { itemType, itemId, idempotencyKey } = await req.json();

    if (!itemType || !itemId || !idempotencyKey) {
        return NextResponse.json({ error: 'Thiếu thông tin (itemType, itemId, idempotencyKey)' }, { status: 400 });
    }

    const priceMap: Record<string, Record<string, number>> = {
        PLAN: { starter: 299000, pro: 799000 },
        MINIAPP: { booking: 199000, inventory: 149000, loyalty: 249000 },
        FEATURE: { ai_suite: 99000, api_access: 199000 },
    };
    const price = priceMap[itemType]?.[itemId];
    if (!price) {
        return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });
    }

    try {
        const result = await platformDb.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId } });
            }

            const credits = await tx.walletLedger.aggregate({
                where: { walletId: wallet.id, direction: 'CREDIT' },
                _sum: { amount: true },
            });
            const debits = await tx.walletLedger.aggregate({
                where: { walletId: wallet.id, direction: 'DEBIT' },
                _sum: { amount: true },
            });
            const balance = (credits._sum.amount || 0) - (debits._sum.amount || 0);

            if (balance < price) throw new Error('INSUFFICIENT_BALANCE');

            const existing = await tx.walletLedger.findUnique({
                where: { userId_idempotencyKey: { userId, idempotencyKey } },
            });
            if (existing) throw new Error('ALREADY_PROCESSED');

            const purchase = await tx.purchase.create({
                data: { userId, itemType, itemId, amount: price, status: 'PAID', paidAt: new Date() },
            });

            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId,
                    type: 'SPEND', amount: price, direction: 'DEBIT',
                    refType: 'PURCHASE', refId: purchase.id,
                    idempotencyKey, note: `Mua ${itemType}: ${itemId}`,
                },
            });

            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balanceAvailable: balance - price },
            });

            return { purchase, newBalance: balance - price };
        });

        return NextResponse.json({ status: 'PAID', purchase: result.purchase, newBalance: result.newBalance });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'INSUFFICIENT_BALANCE') {
            return NextResponse.json({ error: 'Số dư không đủ', requiredAmount: price, topupUrl: `/hub/wallet?topupAmount=${price}` }, { status: 402 });
        }
        if (msg === 'ALREADY_PROCESSED') {
            return NextResponse.json({ error: 'Giao dịch đã được xử lý', idempotencyKey }, { status: 409 });
        }
        console.error('Purchase error:', e);
        return NextResponse.json({ error: 'Lỗi xử lý giao dịch' }, { status: 500 });
    }
}
