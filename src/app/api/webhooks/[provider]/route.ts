import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

/**
 * Bank webhook receiver.
 * Matches incoming payment transactions to pending orders.
 * 
 * Idempotency: txnRef must be unique (prevents double processing).
 * Match rules: amount == order.amount AND description contains orderCode AND order is PENDING
 */
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const { provider } = await params;

        // Optional: verify webhook signature
        const webhookSecret = process.env.WEBHOOK_SECRET;
        if (webhookSecret) {
            const sig = req.headers.get('x-webhook-signature');
            if (sig !== webhookSecret) {
                console.warn('[WEBHOOK] Invalid signature');
                return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
            }
        }

        const body = await req.json();

        // Expected body format:
        // { txnRef, amount, description, paidAt }
        const { txnRef, amount, description, paidAt } = body;

        if (!txnRef || !amount || !description) {
            return NextResponse.json(
                { error: 'Missing required fields: txnRef, amount, description' },
                { status: 400 }
            );
        }

        // 1. Idempotency check - has this txn been processed?
        const existingTxn = await platformDb.paymentTxn.findUnique({
            where: { txnRef: String(txnRef) },
        });
        if (existingTxn) {
            console.log(`[WEBHOOK] Duplicate txnRef: ${txnRef}, skipping`);
            return NextResponse.json({ status: 'duplicate', message: 'Already processed' });
        }

        // 2. Extract order code from description (EMK-XXXXXX)
        const orderCodeMatch = String(description).match(/EMK-[A-Z0-9]{6}/);
        if (!orderCodeMatch) {
            console.warn(`[WEBHOOK] No order code found in description: ${description}`);
            // Still record the transaction for manual reconciliation
            await platformDb.paymentTxn.create({
                data: {
                    workspaceId: 'UNMATCHED',
                    provider,
                    txnRef: String(txnRef),
                    amount: Number(amount),
                    description: String(description),
                    paidAt: paidAt ? new Date(paidAt) : new Date(),
                    rawJson: { note: 'No order code match' },
                },
            });
            return NextResponse.json({ status: 'unmatched', message: 'No order code found' });
        }

        const orderCode = orderCodeMatch[0];

        // 3. Find matching pending order
        const order = await platformDb.upgradeOrder.findUnique({
            where: { orderCode },
        });

        if (!order) {
            console.warn(`[WEBHOOK] Order not found: ${orderCode}`);
            return NextResponse.json({ status: 'not_found', message: 'Order not found' });
        }

        if (order.status !== 'PENDING') {
            console.warn(`[WEBHOOK] Order ${orderCode} is ${order.status}, not PENDING`);
            return NextResponse.json({ status: 'already_processed', message: `Order is ${order.status}` });
        }

        // 4. Check amount
        const txnAmount = Number(amount);
        if (txnAmount < order.amount) {
            // Insufficient amount → mark for review
            await platformDb.upgradeOrder.update({
                where: { id: order.id },
                data: { status: 'NEED_REVIEW' },
            });
            await platformDb.paymentTxn.create({
                data: {
                    workspaceId: order.workspaceId,
                    provider,
                    txnRef: String(txnRef),
                    amount: txnAmount,
                    description: String(description),
                    paidAt: paidAt ? new Date(paidAt) : new Date(),
                    rawJson: { note: 'Amount mismatch', expectedAmount: order.amount },
                },
            });
            console.warn(`[WEBHOOK] Amount mismatch for ${orderCode}: got ${txnAmount}, expected ${order.amount}`);
            return NextResponse.json({ status: 'amount_mismatch', message: 'Partial payment, needs review' });
        }

        // 5. Success! Process the order
        await platformDb.$transaction(async (tx) => {
            // Mark order as PAID
            await tx.upgradeOrder.update({
                where: { id: order.id },
                data: { status: 'PAID' },
            });

            // Record transaction
            await tx.paymentTxn.create({
                data: {
                    workspaceId: order.workspaceId,
                    provider,
                    txnRef: String(txnRef),
                    amount: txnAmount,
                    description: String(description),
                    paidAt: paidAt ? new Date(paidAt) : new Date(),
                    rawJson: { orderCode },
                },
            });

            // Grant entitlements
            const items = order.itemsJson as Array<{
                moduleKey: string;
                months: number;
            }>;

            for (const item of items) {
                const now = new Date();
                const activeTo = new Date();
                activeTo.setMonth(activeTo.getMonth() + item.months);

                // Upsert entitlement
                const existing = await tx.entitlement.findFirst({
                    where: { workspaceId: order.workspaceId, moduleKey: item.moduleKey },
                });

                if (existing) {
                    // Extend from current activeTo or now
                    const extendFrom =
                        existing.activeTo && existing.activeTo > now
                            ? existing.activeTo
                            : now;
                    const newActiveTo = new Date(extendFrom);
                    newActiveTo.setMonth(newActiveTo.getMonth() + item.months);

                    await tx.entitlement.update({
                        where: { id: existing.id },
                        data: { status: 'ACTIVE', activeTo: newActiveTo },
                    });
                } else {
                    await tx.entitlement.create({
                        data: {
                            workspaceId: order.workspaceId,
                            moduleKey: item.moduleKey,
                            status: 'ACTIVE',
                            activeFrom: now,
                            activeTo,
                        },
                    });
                }
            }

            // Re-activate subscription if it was PAST_DUE
            const sub = await tx.subscription.findFirst({
                where: { workspaceId: order.workspaceId, status: 'PAST_DUE' },
            });
            if (sub) {
                const newEnd = new Date();
                newEnd.setMonth(newEnd.getMonth() + 1);
                await tx.subscription.update({
                    where: { id: sub.id },
                    data: {
                        status: 'ACTIVE',
                        currentPeriodStart: new Date(),
                        currentPeriodEnd: newEnd,
                    },
                });
                // Re-activate workspace if suspended
                await tx.workspace.update({
                    where: { id: order.workspaceId },
                    data: { status: 'ACTIVE' },
                });
            }

            // Audit log
            await tx.auditLog.create({
                data: {
                    workspaceId: order.workspaceId,
                    actorUserId: order.workspaceId, // system
                    action: 'PAYMENT_CONFIRMED',
                    payloadJson: { orderCode, txnRef, amount: txnAmount },
                },
            });
        });

        console.log(`[WEBHOOK] ✅ Order ${orderCode} confirmed, entitlements granted`);
        return NextResponse.json({ status: 'confirmed', orderCode });
    } catch (error) {
        console.error('[WEBHOOK]', error);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
