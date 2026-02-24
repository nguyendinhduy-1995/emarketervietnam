import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';

// Demo carrier data (works without DB)
const CARRIERS = [
    { carrier: 'GHN', name: 'Giao Hàng Nhanh', enabled: true, mode: 'WEBHOOK', apiUrl: 'https://dev-online-gateway.ghn.vn', lastHealthCheck: new Date().toISOString(), lastError: null },
    { carrier: 'GHTK', name: 'Giao Hàng Tiết Kiệm', enabled: true, mode: 'POLL', apiUrl: 'https://services.giaohangtietkiem.vn', lastHealthCheck: new Date().toISOString(), lastError: null },
    { carrier: 'VIETTEL_POST', name: 'Viettel Post', enabled: false, mode: 'WEBHOOK', apiUrl: 'https://partner.viettelpost.vn', lastHealthCheck: null, lastError: null },
    { carrier: 'JT', name: 'J&T Express', enabled: false, mode: 'POLL', apiUrl: 'https://jtexpress.vn/api', lastHealthCheck: null, lastError: null },
    { carrier: 'NINJA_VAN', name: 'Ninja Van', enabled: false, mode: 'WEBHOOK', apiUrl: 'https://api.ninjavan.co', lastHealthCheck: null, lastError: null },
    { carrier: 'VNPOST', name: 'VNPost / EMS', enabled: false, mode: 'POLL', apiUrl: 'https://donhang.vnpost.vn', lastHealthCheck: null, lastError: null },
    { carrier: 'AHAMOVE', name: 'Ahamove (Nội thành)', enabled: false, mode: 'WEBHOOK', apiUrl: 'https://apistg.ahamove.com', lastHealthCheck: null, lastError: null },
    { carrier: 'OTHER', name: 'Hãng khác / Tự giao', enabled: false, mode: 'WEBHOOK', apiUrl: null, lastHealthCheck: null, lastError: null },
];

// Status mapping reference
const STATUS_MAPPING = {
    GHN: { ready_to_pick: 'PICKED_UP', picking: 'PICKED_UP', delivering: 'IN_TRANSIT', delivered: 'DELIVERED', delivery_fail: 'FAILED_DELIVERY', return: 'RETURNED_TO_SENDER', cancel: 'CANCELLED' },
    GHTK: { '1': 'CREATED', '2': 'PICKED_UP', '5': 'IN_TRANSIT', '6': 'OUT_FOR_DELIVERY', '5_1': 'DELIVERED', '21': 'FAILED_DELIVERY', '9': 'RETURNED_TO_SENDER' },
    VIETTEL_POST: { '100': 'CREATED', '200': 'PICKED_UP', '300': 'IN_TRANSIT', '501': 'DELIVERED', '502': 'FAILED_DELIVERY', '504': 'RETURNED_TO_SENDER' },
};

export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    try {
        // Try DB first
        const db = (await import('@/lib/db')).default;
        const configs = await db.carrierConfig.findMany({ orderBy: { carrier: 'asc' } });
        if (configs.length > 0) {
            return NextResponse.json({ carriers: configs, statusMapping: STATUS_MAPPING });
        }
    } catch { /* DB unavailable */ }

    return NextResponse.json({ carriers: CARRIERS, statusMapping: STATUS_MAPPING });
}

export async function POST(request: NextRequest) {
    const authError = requireAdmin(request, 'orders');
    if (authError) return authError;

    try {
        const body = await request.json();
        const { carrier, enabled, mode, apiKey, apiUrl, webhookSecret } = body;

        try {
            const db = (await import('@/lib/db')).default;
            const config = await db.carrierConfig.upsert({
                where: { carrier },
                update: { enabled, mode, apiKey, apiUrl, webhookSecret, updatedAt: new Date() },
                create: { carrier, name: CARRIERS.find(c => c.carrier === carrier)?.name || carrier, enabled, mode, apiKey, apiUrl, webhookSecret },
            });
            return NextResponse.json({ success: true, config });
        } catch {
            return NextResponse.json({ success: true, message: 'Demo mode — changes not persisted' });
        }
    } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
}
