import { NextRequest, NextResponse } from 'next/server';
import { spaDb } from '@/lib/db/spa';
import { requireTenant } from '@/lib/tenant';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const tenant = await requireTenant(spaSlug);
        if (tenant instanceof NextResponse) return tenant;

        const body = await request.json();
        const { code, totalAmount } = body;

        if (!code || totalAmount === undefined) {
            return NextResponse.json({ error: 'Missing code or totalAmount' }, { status: 400 });
        }

        const voucher = await spaDb.voucher.findFirst({
            where: { workspaceId: tenant.workspaceId, code: code.toUpperCase() },
        });

        if (!voucher) {
            return NextResponse.json({ error: 'Mã giảm giá không tồn tại.' }, { status: 404 });
        }

        if (!voucher.isActive) {
            return NextResponse.json({ error: 'Mã giảm giá đã bị khóa.' }, { status: 400 });
        }

        if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Mã giảm giá đã hết hạn.' }, { status: 400 });
        }

        if (voucher.used >= voucher.limit) {
            return NextResponse.json({ error: 'Mã giảm giá đã hết lượt sử dụng.' }, { status: 400 });
        }

        if (totalAmount < voucher.minOrderValue) {
            return NextResponse.json({ error: `Đơn hàng tối thiểu để dùng mã này là ${voucher.minOrderValue.toLocaleString()}đ.` }, { status: 400 });
        }

        let discount = 0;
        if (voucher.type === 'PERCENT') {
            discount = Math.floor((totalAmount * voucher.value) / 100);
            if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
                discount = voucher.maxDiscount;
            }
        } else {
            // FIXED
            discount = voucher.value;
        }

        // Ensure discount is not greater than total amount
        discount = Math.min(discount, totalAmount);

        return NextResponse.json({ discount, voucherCode: voucher.code });
    } catch (error) {
        console.error('[VOUCHERS_APPLY_POST]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
