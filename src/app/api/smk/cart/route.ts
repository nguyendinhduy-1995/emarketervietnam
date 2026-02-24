import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { getCustomerSessionFromRequest } from '@/lib/smk/auth';

// GET /api/cart — get or create cart for user/session
export async function GET(req: NextRequest) {
    // S5: userId from session cookie
    const userId = getCustomerSessionFromRequest(req)?.userId || null;
    const sessionId = req.cookies.get('smk_session')?.value || 'anon-session';

    const where = userId ? { userId } : { sessionId };

    let cart = await db.cart.findFirst({
        where,
        include: {
            items: {
                include: {
                    variant: {
                        include: { product: { select: { name: true, slug: true, brand: true } } },
                    },
                },
            },
        },
    });

    if (!cart) {
        cart = await db.cart.create({
            data: userId ? { userId } : { sessionId },
            include: {
                items: {
                    include: {
                        variant: {
                            include: { product: { select: { name: true, slug: true, brand: true } } },
                        },
                    },
                },
            },
        });
    }

    const subtotal = cart.items.reduce((sum: number, i: { priceSnapshot: number; qty: number }) => sum + i.priceSnapshot * i.qty, 0);

    return NextResponse.json({ cart, subtotal, itemCount: cart.items.length });
}

// POST /api/cart — add item to cart
export async function POST(req: NextRequest) {
    const { variantId, qty = 1 } = await req.json();
    const userId = getCustomerSessionFromRequest(req)?.userId || null;
    const sessionId = req.cookies.get('smk_session')?.value || 'anon-session';

    if (!variantId) {
        return NextResponse.json({ error: 'variantId required' }, { status: 400 });
    }

    const MAX_QTY = 10;
    const variant = await db.productVariant.findUnique({ where: { id: variantId } });
    if (!variant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
    }

    // L1: Check available stock (stockQty - reservedQty)
    if (variant.stockQty - variant.reservedQty < qty) {
        return NextResponse.json({ error: 'Hết hàng' }, { status: 400 });
    }

    const where = userId ? { userId } : { sessionId };
    let cart = await db.cart.findFirst({ where });
    if (!cart) {
        cart = await db.cart.create({ data: userId ? { userId } : { sessionId } });
    }

    const existingItem = await db.cartItem.findUnique({
        where: { cartId_variantId: { cartId: cart.id, variantId } },
    });

    if (existingItem) {
        // L3: Cap at MAX_QTY server-side
        const newQty = Math.min(existingItem.qty + qty, MAX_QTY);
        await db.cartItem.update({
            where: { id: existingItem.id },
            data: { qty: newQty, priceSnapshot: variant.price },
        });
    } else {
        await db.cartItem.create({
            data: { cartId: cart.id, variantId, qty: Math.min(qty, MAX_QTY), priceSnapshot: variant.price },
        });
    }

    return NextResponse.json({ ok: true, message: 'Đã thêm vào giỏ' });
}

// PATCH /api/cart — update item qty
export async function PATCH(req: NextRequest) {
    const { itemId, qty } = await req.json();

    if (!itemId || qty == null) {
        return NextResponse.json({ error: 'itemId and qty required' }, { status: 400 });
    }

    if (qty <= 0) {
        await db.cartItem.delete({ where: { id: itemId } });
        return NextResponse.json({ ok: true, message: 'Đã xoá' });
    }

    // L2: Check stock before increasing qty
    // L3: Cap at max qty
    const MAX_QTY = 10;
    const cappedQty = Math.min(qty, MAX_QTY);
    const item = await db.cartItem.findUnique({ where: { id: itemId } });
    if (item) {
        const variant = await db.productVariant.findUnique({ where: { id: item.variantId } });
        if (variant && cappedQty > item.qty && variant.stockQty - variant.reservedQty < cappedQty) {
            return NextResponse.json({ error: 'Không đủ tồn kho' }, { status: 400 });
        }
    }

    await db.cartItem.update({ where: { id: itemId }, data: { qty: cappedQty } });
    return NextResponse.json({ ok: true });
}

// DELETE /api/cart — clear cart
export async function DELETE(req: NextRequest) {
    const userId = getCustomerSessionFromRequest(req)?.userId || null;
    const sessionId = req.cookies.get('smk_session')?.value || 'anon-session';

    const where = userId ? { userId } : { sessionId };
    const cart = await db.cart.findFirst({ where });

    if (cart) {
        await db.cartItem.deleteMany({ where: { cartId: cart.id } });
    }

    return NextResponse.json({ ok: true, message: 'Giỏ đã trống' });
}
