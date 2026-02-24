import { NextResponse } from 'next/server';

// Auto-payout: tự động chi trả khi HH ≥ 200K cuối tuần
export async function POST() {
    try {
        // In production, this would:
        // 1. Query partners with pending commission >= 200,000 VND
        // 2. Create payout requests automatically
        // 3. Process via bank transfer API (VietQR, etc.)
        // 4. Send notification via Zalo/email

        const THRESHOLD = 200000; // 200K VND

        // Demo response
        return NextResponse.json({
            success: true,
            processed: 3,
            totalAmount: 1250000,
            threshold: THRESHOLD,
            message: 'Đã xử lý 3 yêu cầu chi trả tự động',
            details: [
                { partnerCode: 'DUY001', amount: 450000, bank: 'Vietcombank', status: 'completed' },
                { partnerCode: 'MINH002', amount: 380000, bank: 'MB Bank', status: 'completed' },
                { partnerCode: 'HUONG003', amount: 420000, bank: 'Techcombank', status: 'completed' },
            ],
        });
    } catch {
        return NextResponse.json({ error: 'Lỗi xử lý chi trả tự động' }, { status: 500 });
    }
}

// GET: check pending payouts
export async function GET() {
    return NextResponse.json({
        pendingCount: 5,
        totalPending: 2150000,
        threshold: 200000,
        nextAutoRun: 'Thứ 7, 18:00',
        partners: [
            { code: 'DUY001', pending: 450000, eligible: true },
            { code: 'MINH002', pending: 380000, eligible: true },
            { code: 'HUONG003', pending: 420000, eligible: true },
            { code: 'ANH004', pending: 150000, eligible: false },
            { code: 'BINH005', pending: 750000, eligible: true },
        ],
    });
}
