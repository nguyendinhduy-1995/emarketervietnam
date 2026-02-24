import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

// POST – Webhook nhận thông báo ghi có từ ngân hàng
export async function POST(req: NextRequest) {
    const signature = req.headers.get('x-webhook-signature');
    if (!signature) {
        console.warn('Webhook nhận không có signature – chỉ chấp nhận trong dev');
    }

    const body = await req.json();
    const { transferContent, amount, bankTxId } = body;

    if (!transferContent || !amount || !bankTxId) {
        return NextResponse.json({ error: 'Thiếu transferContent, amount, bankTxId' }, { status: 400 });
    }

    const intent = await platformDb.topupIntent.findUnique({ where: { transferContent } });
    if (!intent) {
        console.warn(`Webhook: Không tìm thấy intent cho transferContent=${transferContent}`);
        return NextResponse.json({ error: 'Không tìm thấy ý định nạp tiền' }, { status: 404 });
    }

    if (intent.status !== 'PENDING') {
        return NextResponse.json({ ok: true, message: 'Đã xử lý trước đó' });
    }

    if (amount < intent.amount) {
        console.warn(`Webhook: Số tiền không khớp. Cần ${intent.amount}, nhận ${amount}`);
        return NextResponse.json({ error: 'Số tiền không khớp' }, { status: 400 });
    }

    const userId = intent.userId;
    const idempotencyKey = `BANKTX:${bankTxId}`;

    try {
        await platformDb.$transaction(async (tx) => {
            let wallet = await tx.wallet.findUnique({ where: { userId } });
            if (!wallet) {
                wallet = await tx.wallet.create({ data: { userId } });
            }

            const existing = await tx.walletLedger.findUnique({
                where: { userId_idempotencyKey: { userId, idempotencyKey } },
            });
            if (existing) throw new Error('ALREADY_CREDITED');

            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId,
                    type: 'TOPUP', amount: intent.amount, direction: 'CREDIT',
                    refType: 'TOPUP_CONFIRMED', refId: intent.id,
                    idempotencyKey, note: `Nạp tiền QR – ${transferContent}`,
                    metadata: { bankTxId, receivedAmount: amount },
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
            await tx.topupIntent.update({ where: { id: intent.id }, data: { status: 'CONFIRMED', confirmedAt: new Date() } });
        });

        return NextResponse.json({ ok: true, message: 'Nạp tiền thành công', amount: intent.amount, transferContent });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : '';
        if (msg === 'ALREADY_CREDITED') {
            return NextResponse.json({ ok: true, message: 'Đã ghi có trước đó (idempotent)' });
        }
        console.error('Webhook bank-credit error:', e);
        return NextResponse.json({ error: 'Lỗi xử lý' }, { status: 500 });
    }
}

export interface BankTransaction {
    bankTxId: string;
    amount: number;
    transferContent: string;
    timestamp: Date;
}

export interface BankIngestProvider {
    fetchIncomingTransactions(since: Date): Promise<BankTransaction[]>;
}
