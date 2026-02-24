import { NextResponse } from 'next/server';

// Demo shipments for when DB is unavailable
const DEMO_SHIPMENTS: Record<string, any> = {
    'SMK240001': {
        trackingCode: 'SMK240001',
        carrier: 'GHN',
        carrierName: 'Giao Hàng Nhanh',
        status: 'IN_TRANSIT',
        shippedAt: '2026-02-19T10:00:00Z',
        estimatedAt: '2026-02-22T18:00:00Z',
        events: [
            { mappedStatus: 'CREATED', note: 'Đơn hàng đã tạo', location: 'Hệ thống SMK', occurredAt: '2026-02-19T08:00:00Z' },
            { mappedStatus: 'PICKED_UP', note: 'Shipper đã lấy hàng', location: 'Kho SMK — Q. Tân Bình', occurredAt: '2026-02-19T10:30:00Z' },
            { mappedStatus: 'IN_TRANSIT', note: 'Đang vận chuyển đến bưu cục đích', location: 'Trung tâm phân loại GHN — HCM', occurredAt: '2026-02-20T06:00:00Z' },
        ],
    },
    'SMK240002': {
        trackingCode: 'SMK240002',
        carrier: 'GHTK',
        carrierName: 'Giao Hàng Tiết Kiệm',
        status: 'DELIVERED',
        shippedAt: '2026-02-17T09:00:00Z',
        deliveredAt: '2026-02-19T14:00:00Z',
        events: [
            { mappedStatus: 'CREATED', note: 'Đơn hàng đã tạo', location: 'Hệ thống SMK', occurredAt: '2026-02-17T07:00:00Z' },
            { mappedStatus: 'PICKED_UP', note: 'Nhân viên đã lấy hàng', location: 'Kho SMK', occurredAt: '2026-02-17T09:30:00Z' },
            { mappedStatus: 'IN_TRANSIT', note: 'Đang trung chuyển HCM → Hà Nội', location: 'Trung tâm GHTK HCM', occurredAt: '2026-02-18T02:00:00Z' },
            { mappedStatus: 'OUT_FOR_DELIVERY', note: 'Đang giao hàng', location: 'Bưu cục Cầu Giấy, Hà Nội', occurredAt: '2026-02-19T08:00:00Z' },
            { mappedStatus: 'DELIVERED', note: 'Giao thành công — người nhận ký', location: 'Q. Cầu Giấy, Hà Nội', occurredAt: '2026-02-19T14:00:00Z' },
        ],
    },
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();

    if (!code) {
        return NextResponse.json({ error: 'Vui lòng nhập mã vận đơn' }, { status: 400 });
    }

    try {
        // Try DB first
        const db = (await import('@/lib/db')).default;
        const shipment = await db.shipment.findUnique({
            where: { trackingCode: code },
            include: {
                events: { orderBy: { occurredAt: 'desc' } },
                order: { select: { code: true, status: true, shippingAddress: true } },
            },
        });

        if (shipment) {
            // Mask sensitive info
            const addr = shipment.order?.shippingAddress as any;
            const maskedAddress = addr ? `${addr.district || ''}, ${addr.province || ''}` : null;

            return NextResponse.json({
                found: true,
                trackingCode: shipment.trackingCode,
                carrier: shipment.carrier,
                status: shipment.status,
                shippedAt: shipment.shippedAt,
                deliveredAt: shipment.deliveredAt,
                estimatedAt: shipment.estimatedAt,
                orderCode: shipment.order?.code,
                destination: maskedAddress,
                events: shipment.events.map(e => ({
                    mappedStatus: e.mappedStatus,
                    note: e.note,
                    location: e.location,
                    occurredAt: e.occurredAt,
                })),
            });
        }
    } catch { /* DB unavailable */ }

    // F2: Demo fallback only in non-production
    if (process.env.NODE_ENV !== 'production') {
        const demo = DEMO_SHIPMENTS[code];
        if (demo) {
            return NextResponse.json({ found: true, ...demo });
        }
    }

    return NextResponse.json({ found: false, message: 'Không tìm thấy vận đơn. Vui lòng kiểm tra lại mã.' }, { status: 404 });
}
