import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/growth/abandoned-cart — process abandoned cart notifications
export async function POST(req: NextRequest) {
    const { action } = await req.json();

    if (action === 'scan') {
        return await scanAbandonedCarts();
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

// GET /api/growth/abandoned-cart — get abandoned carts summary
export async function GET() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentAbandoned, oldAbandoned, recovered] = await Promise.all([
        // Carts updated 1-24h ago with items
        db.cart.count({
            where: {
                updatedAt: { gte: oneDayAgo, lte: oneHourAgo },
                items: { some: {} },
            },
        }),
        // Carts older than 24h
        db.cart.count({
            where: {
                updatedAt: { lt: oneDayAgo },
                items: { some: {} },
            },
        }),
        // Carts where user later placed an order (last 7 days)
        db.order.count({
            where: {
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
        }),
    ]);

    return NextResponse.json({
        stats: {
            recentAbandoned,
            oldAbandoned,
            totalAbandoned: recentAbandoned + oldAbandoned,
            recoveredThisWeek: recovered,
        },
    });
}

async function scanAbandonedCarts() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

    // Find carts with items, updated 1h-3d ago, where user has NOT placed an order since
    const carts = await db.cart.findMany({
        where: {
            updatedAt: { gte: threeDaysAgo, lte: oneHourAgo },
            items: { some: {} },
            userId: { not: null },
        },
        include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
            items: {
                include: {
                    variant: {
                        include: { product: { select: { name: true, slug: true } } },
                    },
                },
            },
        },
        take: 100,
    });

    // Filter out users who already completed a purchase
    const abandonedCarts = [];
    for (const cart of carts) {
        if (!cart.userId) continue;

        const recentOrder = await db.order.findFirst({
            where: {
                userId: cart.userId,
                createdAt: { gte: cart.updatedAt },
                status: { notIn: ['CANCELLED'] },
            },
        });

        if (!recentOrder) {
            const cartTotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);
            const hoursSinceUpdate = Math.round((Date.now() - cart.updatedAt.getTime()) / (1000 * 60 * 60));

            // Determine message tier
            let tier: 'gentle' | 'urgent' | 'discount';
            if (hoursSinceUpdate < 3) tier = 'gentle';
            else if (hoursSinceUpdate < 24) tier = 'urgent';
            else tier = 'discount';

            const messages: Record<string, string> = {
                gentle: `👋 ${cart.user?.name || 'Bạn'} ơi, giỏ hàng của bạn đang chờ!\n🛒 ${cart.items.length} sản phẩm • ${new Intl.NumberFormat('vi-VN').format(cartTotal)}₫\n👉 Quay lại hoàn tất đơn hàng nhé!`,
                urgent: `⏰ Đừng bỏ lỡ!\n${cart.items.map((i) => `• ${i.variant.product.name}`).join('\n')}\nTổng: ${new Intl.NumberFormat('vi-VN').format(cartTotal)}₫\n🚚 Freeship cho đơn từ 500K!`,
                discount: `🎁 Ưu đãi riêng cho bạn!\nGiảm thêm 5% cho giỏ hàng ${new Intl.NumberFormat('vi-VN').format(cartTotal)}₫\nMã: COMEBACK5 — Hết hạn trong 24h`,
            };

            abandonedCarts.push({
                cartId: cart.id,
                userId: cart.userId,
                userName: cart.user?.name,
                userPhone: cart.user?.phone,
                userEmail: cart.user?.email,
                itemCount: cart.items.length,
                total: cartTotal,
                hoursSinceUpdate,
                tier,
                message: messages[tier],
                items: cart.items.map((i) => ({
                    name: i.variant.product.name,
                    slug: i.variant.product.slug,
                    qty: i.qty,
                    price: i.priceSnapshot,
                })),
            });

            // Log the abandoned cart event
            await db.eventLog.create({
                data: {
                    type: 'ADD_TO_CART', // Reuse existing type for abandoned scan
                    userId: cart.userId,
                    payload: { action: 'abandoned_scan', tier, hoursSinceUpdate, total: cartTotal },
                },
            });
        }
    }

    return NextResponse.json({
        processed: carts.length,
        abandoned: abandonedCarts.length,
        carts: abandonedCarts,
    });
}
