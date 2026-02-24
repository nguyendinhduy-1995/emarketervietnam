import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

const MIN_AMOUNT = 100000;

// POST – Tạo ý định nạp tiền + QR
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const userId = session.userId;
    const { amount } = await req.json();

    if (!amount || amount < MIN_AMOUNT) {
        return NextResponse.json({
            error: `Số tiền nạp tối thiểu là ${MIN_AMOUNT.toLocaleString('vi-VN')}đ`,
        }, { status: 400 });
    }

    const userShort = userId.slice(-4).toUpperCase();
    const idShort = Date.now().toString(36).slice(-5).toUpperCase();
    const transferContent = `EMK${userShort}-${idShort}`;

    const bankAccount = await platformDb.bankAccount.findFirst({
        where: { isActive: true },
    });

    let qrPayload = '';
    if (bankAccount) {
        const bankCode = bankAccount.bankCode || 'VCB';
        const accountNo = bankAccount.accountNumber;
        qrPayload = `https://img.vietqr.io/image/${bankCode}-${accountNo}-compact2.jpg?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankAccount.accountName)}`;
    }

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    const topupIntent = await platformDb.topupIntent.create({
        data: {
            userId,
            amount,
            transferContent,
            bankAccountId: bankAccount?.id || null,
            qrPayload: qrPayload || null,
            expiresAt,
        },
    });

    return NextResponse.json({
        topupIntent: {
            id: topupIntent.id, amount: topupIntent.amount,
            status: topupIntent.status, transferContent: topupIntent.transferContent,
            qrPayload: topupIntent.qrPayload, expiresAt: topupIntent.expiresAt,
        },
        bankAccount: bankAccount ? {
            bankName: bankAccount.bankName,
            accountNumber: bankAccount.accountNumber,
            accountName: bankAccount.accountName,
        } : null,
    });
}
