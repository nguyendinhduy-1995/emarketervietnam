import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import crypto from 'crypto';

// Hub Checkout: Product → Order → Wallet Debit → Entitlement
export async function POST(req: NextRequest) {
    const { cookies } = req;
    const sessionToken = cookies.get('hub_session')?.value || cookies.get('emk_session')?.value;
    if (!sessionToken) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    let userId: string;
    try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1] || '', 'base64').toString());
        userId = payload.userId;
        if (!userId) throw new Error('No userId');
    } catch {
        return NextResponse.json({ error: 'Token không hợp lệ' }, { status: 401 });
    }

    const body = await req.json();
    const { productId, planId, source } = body;
    if (!productId) return NextResponse.json({ error: 'productId là bắt buộc' }, { status: 400 });

    // 1. Get product
    const product = await db.product.findUnique({
        where: { id: productId },
        include: { digitalAssets: { where: { isActive: true } } },
    });
    if (!product || product.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Sản phẩm không tồn tại hoặc chưa công bố' }, { status: 404 });
    }

    // 2. Determine price
    let totalAmount = 0;
    if (product.billingModel === 'SUBSCRIPTION') totalAmount = product.priceRental || product.priceMonthly;
    else if (product.billingModel === 'ONE_TIME') totalAmount = product.priceSale || product.priceOriginal;

    // 3. Check wallet
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (totalAmount > 0) {
        if (!wallet) return NextResponse.json({ error: 'Chưa có ví' }, { status: 400 });
        if (wallet.balanceAvailable < totalAmount) {
            return NextResponse.json({
                error: `Số dư không đủ. Cần ${totalAmount.toLocaleString()}đ, còn ${wallet.balanceAvailable.toLocaleString()}đ`,
                code: 'INSUFFICIENT_BALANCE', required: totalAmount, balance: wallet.balanceAvailable,
            }, { status: 400 });
        }
    }

    // 4. Find workspace
    const membership = await db.membership.findFirst({ where: { userId } });
    const workspace = membership ? await db.workspace.findUnique({ where: { id: membership.workspaceId } }) : null;
    const orgId = workspace?.orgId || null;

    // 5. Atomic transaction
    const idempKey = `checkout_${userId}_${productId}_${Date.now()}`;
    const result = await db.$transaction(async (tx) => {
        // Create order
        const order = await tx.commerceOrder.create({
            data: {
                userId, orgId,
                source: source || 'HUB', status: 'PAID', totalAmount,
                items: { create: { productId, planId: planId || null, quantity: 1, unitPrice: totalAmount, lineTotal: totalAmount } },
            },
            include: { items: true },
        });

        // Debit wallet
        if (totalAmount > 0 && wallet) {
            await tx.wallet.update({
                where: { id: wallet.id },
                data: { balanceAvailable: { decrement: totalAmount } },
            });
            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId, type: 'SPEND', amount: totalAmount,
                    direction: 'DEBIT', refType: 'PURCHASE', refId: order.id,
                    idempotencyKey: idempKey, note: `Mua ${product.name}`,
                },
            });
        }

        // Entitlement
        if (workspace) {
            await tx.entitlement.create({
                data: {
                    workspaceId: workspace.id, userId, productId, moduleKey: product.key,
                    scope: product.type === 'CRM' ? 'TENANT' : 'USER', status: 'ACTIVE',
                    meta: { orderId: order.id, productType: product.type },
                },
            });
        }

        // Subscription
        if (product.billingModel === 'SUBSCRIPTION' && workspace) {
            const endDate = new Date(); endDate.setMonth(endDate.getMonth() + 1);
            await tx.subscription.create({
                data: {
                    workspaceId: workspace.id, userId, productId, planId: planId || null,
                    planKey: product.key, status: 'ACTIVE', currentPeriodEnd: endDate,
                },
            });
        }

        // Download grants (DIGITAL)
        if (product.type === 'DIGITAL' && product.digitalAssets.length > 0) {
            for (const asset of product.digitalAssets) {
                await tx.downloadGrant.create({
                    data: { userId, productId, orderId: order.id, assetId: asset.id, maxDownloads: 5 },
                });
            }
        }

        return order;
    });

    return NextResponse.json({
        ok: true, order: result, message: `Mua "${product.name}" thành công!`,
        productType: product.type, deliveryMethod: product.deliveryMethod,
    }, { status: 201 });
}
