import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

import crypto from 'crypto';

// Hub Checkout: Product → Coupon → Order → Wallet Debit → Entitlement → Receipt → Notify
// Supports: SUBSCRIPTION (CRM), ONE_TIME (DIGITAL), PAYG initial purchase (APP)
// Hardened: idempotency, credit balance, coupon, receipt, notification, price snapshot, row lock
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    const body = await req.json();
    const { productId, planId, source, couponCode, idempotencyKey } = body;
    if (!productId) return NextResponse.json({ error: 'productId là bắt buộc' }, { status: 400 });

    // Idempotency check
    const idemKey = idempotencyKey || `checkout_${userId}_${productId}_${Date.now()}`;
    if (idempotencyKey) {
        const existing = await db.commerceOrder.findUnique({ where: { idempotencyKey: idemKey } });
        if (existing) return NextResponse.json({ ok: true, order: existing, message: 'Đã xử lý trước đó' });
    }

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

    // 3. Apply coupon
    let discountAmount = 0;
    let couponId: string | null = null;
    if (couponCode) {
        const coupon = await db.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
        if (!coupon || !coupon.isActive) return NextResponse.json({ error: 'Mã giảm giá không hợp lệ' }, { status: 400 });
        if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return NextResponse.json({ error: 'Mã đã hết hạn' }, { status: 400 });
        if (coupon.maxUses > 0 && coupon.usedCount >= coupon.maxUses) return NextResponse.json({ error: 'Mã đã hết lượt' }, { status: 400 });
        if (totalAmount < coupon.minOrderAmount) return NextResponse.json({ error: `Đơn tối thiểu ${coupon.minOrderAmount.toLocaleString()}đ` }, { status: 400 });
        if (coupon.productIds.length > 0 && !coupon.productIds.includes(productId)) return NextResponse.json({ error: 'Mã không áp dụng cho sản phẩm này' }, { status: 400 });

        // Check if user already used this coupon
        const alreadyUsed = await db.couponRedemption.findFirst({ where: { couponId: coupon.id, userId } });
        if (alreadyUsed) return NextResponse.json({ error: 'Bạn đã sử dụng mã này' }, { status: 400 });

        if (coupon.type === 'PERCENT') {
            discountAmount = Math.floor(totalAmount * coupon.value / 100);
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) discountAmount = coupon.maxDiscount;
        } else {
            discountAmount = coupon.value;
        }
        if (discountAmount > totalAmount) discountAmount = totalAmount;
        couponId = coupon.id;
    }

    const chargeAmount = totalAmount - discountAmount;

    // 4. Check wallet (use credit first, then real balance)
    const wallet = await db.wallet.findUnique({ where: { userId } });
    if (chargeAmount > 0) {
        if (!wallet) return NextResponse.json({ error: 'Chưa có ví' }, { status: 400 });
        if (wallet.status !== 'ACTIVE') return NextResponse.json({ error: 'Ví đang bị khoá' }, { status: 400 });
        const totalBalance = wallet.balanceAvailable + wallet.creditBalance;
        if (totalBalance < chargeAmount) {
            return NextResponse.json({
                error: `Số dư không đủ. Cần ${chargeAmount.toLocaleString()}đ, còn ${totalBalance.toLocaleString()}đ`,
                code: 'INSUFFICIENT_BALANCE', required: chargeAmount, balance: totalBalance,
            }, { status: 400 });
        }
    }

    // 5. Find workspace
    const membership = await db.membership.findFirst({ where: { userId } });
    const workspace = membership ? await db.workspace.findUnique({ where: { id: membership.workspaceId } }) : null;
    const orgId = workspace?.orgId || null;

    // 6. Atomic transaction
    const result = await db.$transaction(async (tx) => {
        // Create order with idempotency
        const order = await tx.commerceOrder.create({
            data: {
                userId, orgId, source: source || 'HUB', status: 'PAID',
                totalAmount, discountAmount, couponId, idempotencyKey: idemKey,
                items: {
                    create: {
                        productId, planId: planId || null, quantity: 1,
                        unitPrice: totalAmount, lineTotal: chargeAmount,
                        priceSnapshot: { unitPrice: totalAmount, billing: product.billingModel, version: 1 },
                    },
                },
            },
            include: { items: true },
        });

        // Debit wallet (credit first, then real balance) — with row lock
        if (chargeAmount > 0 && wallet) {
            // Row lock: SELECT FOR UPDATE prevents concurrent double-spend
            const [lockedWallet] = await tx.$queryRawUnsafe<Array<{ id: string; balanceAvailable: number; creditBalance: number }>>(
                `SELECT "id", "balanceAvailable", "creditBalance" FROM "Wallet" WHERE "id" = $1 FOR UPDATE`,
                wallet.id
            );
            const totalBal = lockedWallet.balanceAvailable + lockedWallet.creditBalance;
            if (totalBal < chargeAmount) {
                throw new Error(`INSUFFICIENT_BALANCE:${totalBal}`);
            }

            let creditUsed = 0;
            let realUsed = chargeAmount;

            if (lockedWallet.creditBalance > 0) {
                creditUsed = Math.min(lockedWallet.creditBalance, chargeAmount);
                realUsed = chargeAmount - creditUsed;
            }

            await tx.wallet.update({
                where: { id: wallet.id },
                data: {
                    balanceAvailable: { decrement: realUsed },
                    creditBalance: { decrement: creditUsed },
                },
            });

            await tx.walletLedger.create({
                data: {
                    walletId: wallet.id, userId, type: 'SPEND', amount: chargeAmount,
                    direction: 'DEBIT', refType: 'PURCHASE', refId: order.id,
                    idempotencyKey: idemKey, note: `Mua ${product.name}${creditUsed > 0 ? ` (credit: ${creditUsed.toLocaleString()}đ)` : ''}`,
                    metadata: { creditUsed, realUsed, discount: discountAmount },
                },
            });
        }

        // Coupon redemption
        if (couponId) {
            await tx.couponRedemption.create({
                data: { couponId, userId, orderId: order.id, discount: discountAmount },
            });
            await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
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

        // Subscription with trial
        if (product.billingModel === 'SUBSCRIPTION' && workspace) {
            const plan = planId ? await tx.plan.findUnique({ where: { id: planId } }) : null;
            const trialDays = plan?.trialDays || 0;
            const endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1);

            await tx.subscription.create({
                data: {
                    workspaceId: workspace.id, userId, productId, planId: planId || null,
                    planKey: product.key,
                    status: trialDays > 0 ? 'TRIAL' : 'ACTIVE',
                    trialEndsAt: trialDays > 0 ? new Date(Date.now() + trialDays * 86400000) : null,
                    currentPeriodEnd: endDate,
                },
            });
        }

        // Download grants with license key (DIGITAL)
        if (product.type === 'DIGITAL' && product.digitalAssets.length > 0) {
            for (const asset of product.digitalAssets) {
                const licenseKey = `EMK-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
                await tx.downloadGrant.create({
                    data: { userId, productId, orderId: order.id, assetId: asset.id, maxDownloads: 5, licenseKey },
                });
            }
        }

        // Receipt
        const receiptNo = `EMK-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
        await tx.receipt.create({
            data: {
                userId, orderId: order.id, type: 'PURCHASE', amount: chargeAmount,
                description: `Mua ${product.name}${discountAmount > 0 ? ` (giảm ${discountAmount.toLocaleString()}đ)` : ''}`,
                receiptNo,
            },
        });

        // Notification
        await tx.notificationQueue.create({
            data: {
                userId, type: 'ENTITLEMENT_GRANTED',
                title: `Mua "${product.name}" thành công!`,
                body: `Bạn đã mua ${product.name} với giá ${chargeAmount.toLocaleString()}đ.${product.type === 'DIGITAL' ? ' Vào Tài khoản > Tải về để tải file.' : ''}`,
                referenceType: 'ORDER', referenceId: order.id,
            },
        });

        // Affiliate commission (if applicable)
        if (orgId) {
            const referral = await tx.referral.findFirst({
                where: { lead: { workspaceId: workspace?.id } },
            });
            if (referral) {
                const holdDate = new Date(); holdDate.setDate(holdDate.getDate() + 14); // 14-day hold
                await tx.commission.create({
                    data: {
                        affiliateId: referral.affiliateId, referralId: referral.id,
                        orderId: order.id, productId, amount: Math.floor(chargeAmount * 0.1),
                        rate: 1000, status: 'HELD', holdUntil: holdDate,
                    },
                });
            }
        }

        return order;
    });


    return NextResponse.json({
        ok: true, order: result, message: `Mua "${product.name}" thành công!`,
        productType: product.type, deliveryMethod: product.deliveryMethod,
        charged: chargeAmount, discount: discountAmount,
    }, { status: 201 });
}
