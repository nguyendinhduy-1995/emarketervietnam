import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/jwt';
import { platformDb } from '@/lib/db/platform';

// GET – Trạng thái của TopupIntent
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { id } = await params;

    const intent = await platformDb.topupIntent.findUnique({ where: { id } });
    if (!intent) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // Auto-expire nếu quá hạn
    if (intent.status === 'PENDING' && intent.expiresAt && new Date() > intent.expiresAt) {
        await platformDb.topupIntent.update({
            where: { id },
            data: { status: 'EXPIRED' },
        });
        return NextResponse.json({
            id: intent.id,
            amount: intent.amount,
            status: 'EXPIRED',
            transferContent: intent.transferContent,
            expiresAt: intent.expiresAt,
        });
    }

    return NextResponse.json({
        id: intent.id,
        amount: intent.amount,
        status: intent.status,
        transferContent: intent.transferContent,
        qrPayload: intent.qrPayload,
        expiresAt: intent.expiresAt,
        confirmedAt: intent.confirmedAt,
    });
}
