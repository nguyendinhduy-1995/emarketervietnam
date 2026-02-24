import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/coupon/apply — validate and apply coupon
export async function POST(req: NextRequest) {
    const { code, subtotal } = await req.json();

    if (!code) return NextResponse.json({ error: 'Coupon code required' }, { status: 400 });

    const coupon = await db.coupon.findUnique({
        where: { code },
        include: { ownerPartner: { select: { partnerCode: true, status: true } } },
    });

    if (!coupon) return NextResponse.json({ error: 'Mã giảm giá không tồn tại' }, { status: 404 });

    const now = new Date();
    if (!coupon.isActive) return NextResponse.json({ error: 'Mã giảm giá đã hết hạn' }, { status: 400 });
    if (now < coupon.startsAt) return NextResponse.json({ error: 'Mã giảm giá chưa bắt đầu' }, { status: 400 });
    if (now > coupon.endsAt) return NextResponse.json({ error: 'Mã giảm giá đã hết hạn' }, { status: 400 });
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return NextResponse.json({ error: 'Mã giảm giá đã hết lượt sử dụng' }, { status: 400 });
    }
    if (coupon.minOrderAmount && subtotal && subtotal < coupon.minOrderAmount) {
        return NextResponse.json({
            error: `Đơn hàng tối thiểu ${new Intl.NumberFormat('vi-VN').format(coupon.minOrderAmount)}₫`,
        }, { status: 400 });
    }

    // Calculate discount
    let discount =
        coupon.type === 'PERCENT'
            ? Math.round(((subtotal || 0) * coupon.value) / 100)
            : coupon.value;

    // L4/R4: Cap PERCENT discount by maxDiscountAmount if set
    if (coupon.maxDiscountAmount && coupon.maxDiscountAmount > 0) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
    }

    return NextResponse.json({
        valid: true,
        coupon: {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discount: Math.min(discount, subtotal || discount),
            partnerCode: coupon.ownerPartner?.partnerCode || null,
        },
    });
}
