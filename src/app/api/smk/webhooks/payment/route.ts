import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/webhooks/payment — handle payment gateway callbacks
export async function POST(req: NextRequest) {
    // S2: Verify webhook secret
    const WEBHOOK_SECRET = process.env.WEBHOOK_PAYMENT_SECRET;
    const reqSecret = req.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && reqSecret !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 403 });
    }

    const body = await req.json();

    // Determine gateway from header or payload
    const gateway = req.headers.get('x-gateway') || body.gateway || 'vnpay';
    const orderId = body.orderId || body.vnp_TxnRef || body.orderCode;
    const status = body.status || body.vnp_ResponseCode;

    if (!orderId) {
        return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    const order = await db.order.findFirst({
        where: { OR: [{ id: orderId }, { code: orderId }] },
    });

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let paymentStatus: 'PAID' | 'FAILED' = 'FAILED';

    switch (gateway) {
        case 'vnpay':
            paymentStatus = status === '00' ? 'PAID' : 'FAILED';
            break;
        case 'momo':
            paymentStatus = body.resultCode === 0 ? 'PAID' : 'FAILED';
            break;
        case 'zalopay':
            paymentStatus = body.return_code === 1 ? 'PAID' : 'FAILED';
            break;
        default:
            paymentStatus = status === 'success' || status === 'PAID' ? 'PAID' : 'FAILED';
    }

    await db.order.update({
        where: { id: order.id },
        data: {
            paymentStatus,
            status: paymentStatus === 'PAID' ? 'PAID' : order.status,
        },
    });

    // Log event
    await db.eventLog.create({
        data: {
            type: paymentStatus === 'PAID' ? 'PURCHASE' : 'ORDER_CANCELLED',
            orderId: order.id,
            userId: order.userId,
            payload: { gateway, rawStatus: status, body },
        },
    });

    if (paymentStatus === 'PAID') {
        // Create order status history entry
        await db.orderStatusHistory.create({
            data: { orderId: order.id, status: 'PAID', note: `Thanh toán ${gateway} thành công` },
        });
    }

    return NextResponse.json({ ok: true, paymentStatus });
}
