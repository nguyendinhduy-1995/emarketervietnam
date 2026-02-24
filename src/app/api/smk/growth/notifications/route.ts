import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// POST /api/growth/notifications — generate growth notifications
// Types: back-in-stock, price-drop, browse-abandon
export async function POST(req: NextRequest) {
    const { type = 'all' } = await req.json().catch(() => ({ type: 'all' }));

    const results: { type: string; users: number; notifications: string[] }[] = [];

    // 1. Back-in-stock: products that were out of stock and now have stock > 0
    if (type === 'all' || type === 'back-in-stock') {
        const backInStock = await db.productVariant.findMany({
            where: { stockQty: { gt: 0 } },
            include: {
                product: {
                    include: {
                        wishlist: { include: { user: true } },
                    },
                },
            },
        });

        const notifications: string[] = [];
        for (const variant of backInStock) {
            for (const wish of variant.product.wishlist) {
                notifications.push(
                    `📦 ${variant.product.name} đã có hàng trở lại! → ${wish.user.name || wish.user.phone || wish.user.email}`
                );
            }
        }

        results.push({ type: 'back-in-stock', users: notifications.length, notifications: notifications.slice(0, 10) });
    }

    // 2. Price-drop: wishlist + recently viewed items where price decreased
    if (type === 'all' || type === 'price-drop') {
        const recentViews = await db.viewHistory.findMany({
            where: { viewedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
            include: {
                product: { include: { variants: { take: 1, orderBy: { price: 'asc' } } } },
                user: true,
            },
            take: 50,
        });

        const notifications: string[] = [];
        for (const view of recentViews) {
            const variant = view.product.variants[0];
            if (variant?.compareAtPrice && variant.price < variant.compareAtPrice) {
                const discount = Math.round((1 - variant.price / variant.compareAtPrice) * 100);
                notifications.push(
                    `💰 ${view.product.name} giảm ${discount}%! → ${view.user.name || view.user.phone || 'user'}`
                );
            }
        }

        results.push({ type: 'price-drop', users: notifications.length, notifications: notifications.slice(0, 10) });
    }

    // 3. Browse-abandon: users who viewed 3+ products but didn't purchase in last 24h
    if (type === 'all' || type === 'browse-abandon') {
        const cutoff = new Date(Date.now() - 86400000);
        const heavyBrowsers = await db.viewHistory.groupBy({
            by: ['userId'],
            where: { viewedAt: { gte: cutoff } },
            _count: { productId: true },
            having: { productId: { _count: { gte: 3 } } },
        });

        const notifications: string[] = [];
        for (const browser of heavyBrowsers) {
            // Check if this user has a recent order
            const recentOrder = await db.order.findFirst({
                where: { userId: browser.userId, createdAt: { gte: cutoff } },
            });

            if (!recentOrder) {
                const user = await db.user.findUnique({ where: { id: browser.userId } });
                notifications.push(
                    `👀 ${user?.name || user?.phone || 'user'} đã xem ${browser._count.productId} sản phẩm nhưng chưa mua`
                );
            }
        }

        results.push({ type: 'browse-abandon', users: notifications.length, notifications: notifications.slice(0, 10) });
    }

    const totalNotifications = results.reduce((s, r) => s + r.users, 0);

    return NextResponse.json({
        ok: true,
        totalNotifications,
        results,
        processedAt: new Date().toISOString(),
    });
}
