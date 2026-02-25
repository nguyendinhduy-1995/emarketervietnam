import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

/**
 * POST /api/hub/subscription/change
 * 
 * Upgrade or downgrade subscription plan, add/remove addons.
 * 
 * Body: {
 *   subscriptionId: string,
 *   newPlanKey?: "MONTHLY" | "YEARLY",
 *   addAddons?: string[],
 *   removeAddons?: string[],
 * }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { subscriptionId, newPlanKey, addAddons, removeAddons } = await req.json();
    if (!subscriptionId) return NextResponse.json({ error: 'subscriptionId required' }, { status: 400 });

    const sub = await db.subscription.findUnique({ where: { id: subscriptionId } });
    if (!sub || sub.userId !== session.userId) {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }
    if (sub.status !== 'ACTIVE' && sub.status !== 'TRIAL') {
        return NextResponse.json({ error: 'Chỉ thay đổi gói ACTIVE/TRIAL' }, { status: 400 });
    }

    const ws = sub.workspaceId;
    const changes: string[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txOps: any[] = [];

    // ── Plan change ──
    if (newPlanKey && newPlanKey !== sub.planKey) {
        const product = sub.productId
            ? await db.product.findUnique({ where: { id: sub.productId } })
            : null;

        if (product) {
            const pYearly = (product as unknown as { priceYearly?: number }).priceYearly;
            const pAddons = (product as unknown as { addons?: unknown[] }).addons;

            const newPrice = newPlanKey === 'YEARLY'
                ? (pYearly || Math.floor((product.priceRental || product.priceMonthly) * 12 * 0.83))
                : (product.priceRental || product.priceMonthly);

            const oldPrice = sub.planKey === 'YEARLY'
                ? (pYearly || Math.floor((product.priceRental || product.priceMonthly) * 12 * 0.83))
                : (product.priceRental || product.priceMonthly);

            // Pro-rate
            const now = new Date();
            const endDate = sub.currentPeriodEnd || new Date(now.getTime() + 30 * 86400_000);
            const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400_000));
            const totalDays = newPlanKey === 'YEARLY' ? 365 : 30;

            const oldDailyRate = (oldPrice || 0) / (sub.planKey === 'YEARLY' ? 365 : 30);
            const credit = Math.floor(oldDailyRate * remainingDays);
            const newCost = Math.floor(newPrice * (remainingDays / totalDays));
            const delta = newCost - credit;

            // Check wallet if upgrade
            if (delta > 0) {
                const wallet = await db.wallet.findUnique({ where: { userId: session.userId } });
                const balance = (wallet?.balanceAvailable || 0) + (wallet?.creditBalance || 0);
                if (balance < delta) {
                    return NextResponse.json({
                        error: 'Số dư không đủ', code: 'INSUFFICIENT_BALANCE',
                        required: delta, balance,
                    }, { status: 400 });
                }
                txOps.push(db.wallet.update({
                    where: { userId: session.userId },
                    data: { balanceAvailable: { decrement: delta } },
                }));
            } else if (delta < 0) {
                txOps.push(db.wallet.update({
                    where: { userId: session.userId },
                    data: { creditBalance: { increment: Math.abs(delta) } },
                }));
            }

            const newEndDate = new Date();
            if (newPlanKey === 'YEARLY') {
                newEndDate.setFullYear(newEndDate.getFullYear() + 1);
            } else {
                newEndDate.setMonth(newEndDate.getMonth() + 1);
            }

            txOps.push(db.subscription.update({
                where: { id: subscriptionId },
                data: { planKey: newPlanKey, currentPeriodEnd: newEndDate },
            }));

            changes.push(`Plan: ${sub.planKey} → ${newPlanKey} (delta: ${delta > 0 ? '+' : ''}${delta}đ)`);

            // ── Add addons (use product.addons) ──
            if (addAddons?.length && pAddons) {
                const productAddons = pAddons as Array<{ featureKey: string; price: number; trialDays: number }>;
                for (const fk of addAddons as string[]) {
                    const def = productAddons.find(a => a.featureKey === fk);
                    const isTrial = def && def.trialDays > 0;
                    const trialEnd = isTrial ? new Date(Date.now() + (def!.trialDays * 86400_000)) : null;

                    // Check if exists first, then create or update
                    const existingEnt = await db.entitlement.findFirst({
                        where: { workspaceId: ws, moduleKey: fk },
                    });
                    if (existingEnt) {
                        txOps.push(db.entitlement.update({
                            where: { id: existingEnt.id },
                            data: {
                                status: isTrial ? 'TRIAL' : 'ACTIVE',
                                activeTo: trialEnd || sub.currentPeriodEnd,
                                revokeReason: null,
                            },
                        }));
                    } else {
                        txOps.push(db.entitlement.create({
                            data: {
                                workspaceId: ws, moduleKey: fk, scope: 'ADDON',
                                status: isTrial ? 'TRIAL' : 'ACTIVE',
                                activeFrom: new Date(),
                                activeTo: trialEnd || sub.currentPeriodEnd,
                            },
                        }));
                    }
                    changes.push(`+addon: ${fk}${isTrial ? ' (trial)' : ''}`);
                }
            }
        }
    }

    // ── Remove addons ──
    if (removeAddons?.length) {
        txOps.push(db.entitlement.updateMany({
            where: { workspaceId: ws, moduleKey: { in: removeAddons }, status: { in: ['ACTIVE', 'TRIAL'] } },
            data: { status: 'REVOKED', revokeReason: 'User removed addon' },
        }));
        changes.push(`-addons: ${removeAddons.join(', ')}`);
    }

    // ── Audit ──
    txOps.push(db.eventLog.create({
        data: {
            workspaceId: ws,
            actorUserId: session.userId,
            type: 'SUBSCRIPTION_CHANGED',
            payloadJson: { subscriptionId, changes, newPlanKey, addAddons, removeAddons },
        },
    }));

    if (txOps.length > 0) {
        await db.$transaction(txOps);
    }

    return NextResponse.json({ ok: true, changes });
}
