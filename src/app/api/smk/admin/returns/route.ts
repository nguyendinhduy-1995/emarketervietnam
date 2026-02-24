import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';

// Demo returns data
const DEMO_RETURNS = [
    { id: 'rma1', code: 'RMA-00001', orderId: 'ord1', orderCode: 'SMK-240115-A01', customerName: 'Nguyễn Văn A', type: 'RETURN', reason: 'Sản phẩm không đúng màu', description: 'Đặt màu gold nhưng nhận màu silver', status: 'PENDING', createdAt: '2026-02-20T10:00:00Z' },
    { id: 'rma2', code: 'RMA-00002', orderId: 'ord2', orderCode: 'SMK-240118-B03', customerName: 'Trần Thị B', type: 'WARRANTY', reason: 'Gọng kính bị lỏng', description: 'Dùng được 1 tuần thì bản lề bị lỏng', status: 'APPROVED', refundAmount: 0, createdAt: '2026-02-19T08:00:00Z' },
    { id: 'rma3', code: 'RMA-00003', orderId: 'ord3', orderCode: 'SMK-240120-C05', customerName: 'Lê Văn C', type: 'EXCHANGE', reason: 'Đổi size', description: 'Kính hơi rộng, muốn đổi size nhỏ hơn', status: 'PROCESSING', createdAt: '2026-02-18T14:00:00Z' },
    { id: 'rma4', code: 'RMA-00004', orderId: 'ord4', orderCode: 'SMK-240121-D02', customerName: 'Phạm Thị D', type: 'RETURN', reason: 'Không ưng sản phẩm', description: 'Kính trông khác so với hình trên web', status: 'COMPLETED', refundAmount: 2990000, createdAt: '2026-02-15T11:00:00Z' },
];

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    try {
        const db = (await import('@/lib/db')).default;
        const returns = await db.returnRequest.findMany({
            include: { order: { select: { code: true } }, user: { select: { name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({
            returns: returns.map((r: any) => ({
                ...r,
                orderCode: r.order.code,
                customerName: r.user.name || r.user.email,
            })),
        });
    } catch { /* DB unavailable */ }

    return NextResponse.json({ returns: DEMO_RETURNS });
}

export async function POST(request: NextRequest) {
    const authError = requireAdmin(request, 'orders');
    if (authError) return authError;

    try {
        const body = await request.json();
        const { orderId, userId, type, reason, description, media } = body;

        if (!orderId || !type || !reason) {
            return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
        }

        try {
            const db = (await import('@/lib/db')).default;
            const code = `RMA-${String(await db.returnRequest.count() + 1).padStart(5, '0')}`;
            const rma = await db.returnRequest.create({
                data: { code, orderId, userId: userId || 'unknown', type, reason, description, media: media || null },
            });
            return NextResponse.json({ success: true, rma });
        } catch {
            return NextResponse.json({ success: true, code: 'RMA-DEMO', message: 'Demo mode' });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}

export async function PATCH(request: NextRequest) {
    const authError = requireAdmin(request, 'orders');
    if (authError) return authError;

    try {
        const body = await request.json();
        const { id, status, adminNote, resolution, refundAmount } = body;

        if (!id || !status) {
            return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
        }

        try {
            const db = (await import('@/lib/db')).default;
            const updated = await db.returnRequest.update({
                where: { id },
                data: { status, adminNote, resolution, refundAmount },
            });
            return NextResponse.json({ success: true, rma: updated });
        } catch {
            return NextResponse.json({ success: true, message: 'Demo mode' });
        }
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
