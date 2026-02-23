import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { generatePaymentQR } from '@/lib/qr';
import { BANK_INFO } from '@/lib/constants';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;

    const order = await platformDb.upgradeOrder.findUnique({
        where: { id },
    });

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Generate QR for pending orders
    let qrDataUrl: string | null = null;
    if (order.status === 'PENDING') {
        qrDataUrl = await generatePaymentQR({
            ...BANK_INFO,
            amount: order.amount,
            content: order.orderCode,
        });
    }

    return NextResponse.json({ order, qrDataUrl });
}
