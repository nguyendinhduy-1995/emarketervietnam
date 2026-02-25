import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/cron/subscription-renew
 * 
 * Called by external cron (daily or every 6h).
 * 
 * Three-phase renewal:
 * 1. PRE-EXPIRY (24h before) — attempt wallet debit → extend if successful
 * 2. PAST_DUE (expired, within 72h grace) — retry debit, notify
 * 3. SUSPENDED (grace exceeded) — deactivate entitlements, lock premium
 */
export async function POST(req: NextRequest) {
    // Verify cron secret
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 3600_000);
    const gracePeriodMs = 72 * 3600_000; // 72 hours

    let renewed = 0;
    let pastDue = 0;
    let suspended = 0;
    const details: { id: string; userId: string; action: string; reason?: string }[] = [];

    // ─── Phase 1: Pre-expiry auto-renew (expires within 24h) ────
    const preExpiry = await db.subscription.findMany({
        where: {
            status: 'ACTIVE',
            currentPeriodEnd: { gt: now, lte: in24h },
        },
    });

    for (const sub of preExpiry) {
        if (!sub.userId) continue;
        const result = await attemptRenewal(sub, now);
        if (result === 'renewed') {
            renewed++;
            details.push({ id: sub.id, userId: sub.userId, action: 'pre_renewed' });
        } else {
            // Low balance notification (still ACTIVE, warn user)
            await db.notificationQueue.create({
                data: {
                    userId: sub.userId,
                    workspaceId: sub.workspaceId,
                    type: 'LOW_BALANCE',
                    title: 'Số dư không đủ gia hạn',
                    body: `Gói dịch vụ sẽ hết hạn trong 24h. Vui lòng nạp thêm vào ví để tự động gia hạn.`,
                    referenceType: 'SUBSCRIPTION',
                    referenceId: sub.id,
                },
            });
            details.push({ id: sub.id, userId: sub.userId, action: 'low_balance_warned' });
        }
    }

    // ─── Phase 2: Expired → PAST_DUE (retry debit, grace period) ────
    const justExpired = await db.subscription.findMany({
        where: {
            status: 'ACTIVE',
            currentPeriodEnd: { lt: now },
        },
    });

    for (const sub of justExpired) {
        if (!sub.userId) continue;
        const result = await attemptRenewal(sub, now);
        if (result === 'renewed') {
            renewed++;
            details.push({ id: sub.id, userId: sub.userId, action: 'renewed_after_expiry' });
        } else {
            // Move to PAST_DUE with grace until
            const graceUntil = new Date(now.getTime() + gracePeriodMs);
            await db.subscription.update({
                where: { id: sub.id },
                data: { status: 'PAST_DUE', graceUntil },
            });

            await db.notificationQueue.create({
                data: {
                    userId: sub.userId,
                    workspaceId: sub.workspaceId,
                    type: 'CHARGE_FAIL',
                    title: 'Gia hạn thất bại — grace 72h',
                    body: `Không thể gia hạn do số dư không đủ. Dịch vụ sẽ bị tạm ngưng sau 72h nếu chưa nạp thêm.`,
                    referenceType: 'SUBSCRIPTION',
                    referenceId: sub.id,
                },
            });

            pastDue++;
            details.push({ id: sub.id, userId: sub.userId, action: 'past_due', reason: 'insufficient_balance' });
        }
    }

    // ─── Phase 2b: Retry PAST_DUE (still within grace) ────
    const pastDueSubs = await db.subscription.findMany({
        where: {
            status: 'PAST_DUE',
            graceUntil: { gt: now },
        },
    });

    for (const sub of pastDueSubs) {
        if (!sub.userId) continue;
        const result = await attemptRenewal(sub, now);
        if (result === 'renewed') {
            renewed++;
            details.push({ id: sub.id, userId: sub.userId, action: 'renewed_from_past_due' });
        }
        // else: still PAST_DUE, keep waiting
    }

    // ─── Phase 3: Grace exceeded → SUSPENDED ────
    const graceExceeded = await db.subscription.findMany({
        where: {
            status: 'PAST_DUE',
            graceUntil: { lte: now },
        },
    });

    for (const sub of graceExceeded) {
        if (!sub.userId) continue;

        await db.$transaction(async (tx) => {
            // Suspend subscription
            await tx.subscription.update({
                where: { id: sub.id },
                data: { status: 'SUSPENDED' },
            });

            // Deactivate all entitlements for this workspace
            await tx.entitlement.updateMany({
                where: {
                    workspaceId: sub.workspaceId,
                    status: 'ACTIVE',
                },
                data: { status: 'INACTIVE', revokeReason: 'SUBSCRIPTION_SUSPENDED' },
            });

            // Log event
            await tx.eventLog.create({
                data: {
                    workspaceId: sub.workspaceId,
                    actorUserId: sub.userId,
                    type: 'SUBSCRIPTION_SUSPENDED',
                    payloadJson: { subscriptionId: sub.id, reason: 'grace_exceeded' },
                },
            });
        });

        // Notify
        await db.notificationQueue.create({
            data: {
                userId: sub.userId,
                workspaceId: sub.workspaceId,
                type: 'SUB_EXPIRING',
                title: 'Dịch vụ đã bị tạm ngưng',
                body: 'Gói dịch vụ đã bị tạm ngưng do không gia hạn. Nạp ví và liên hệ hỗ trợ để kích hoạt lại.',
                referenceType: 'SUBSCRIPTION',
                referenceId: sub.id,
            },
        });

        suspended++;
        details.push({ id: sub.id, userId: sub.userId, action: 'suspended', reason: 'grace_exceeded' });
    }

    // ─── Phase 0: Free plans — just extend ────
    const freeDue = await db.subscription.findMany({
        where: {
            status: { in: ['ACTIVE', 'TRIAL'] },
            currentPeriodEnd: { lt: now },
            planKey: 'FREE',
        },
    });

    for (const sub of freeDue) {
        const newEnd = new Date(now);
        newEnd.setMonth(newEnd.getMonth() + 1);
        await db.subscription.update({
            where: { id: sub.id },
            data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
        });
        renewed++;
        details.push({ id: sub.id, userId: sub.userId || '', action: 'renewed_free' });
    }

    return NextResponse.json({
        ok: true, renewed, pastDue, suspended,
        details,
        runAt: now.toISOString(),
    });
}

// ── Helper: attempt wallet debit for subscription renewal ──

async function attemptRenewal(
    sub: { id: string; userId: string | null; workspaceId: string; planId: string | null; planKey: string },
    now: Date,
): Promise<'renewed' | 'insufficient'> {
    if (!sub.userId) return 'insufficient';

    // Get plan price
    const plan = sub.planId ? await db.plan.findUnique({ where: { id: sub.planId } }) : null;
    const price = (plan as unknown as { price?: number })?.price || 0;

    if (price === 0) {
        // Free plan — just extend
        const newEnd = new Date(now);
        newEnd.setMonth(newEnd.getMonth() + 1);
        await db.subscription.update({
            where: { id: sub.id },
            data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
        });
        return 'renewed';
    }

    // Check wallet
    const wallet = await db.wallet.findUnique({ where: { userId: sub.userId } });
    const walletAny = wallet as unknown as { id: string; balanceAvailable: number; creditBalance: number } | null;
    const balance = (walletAny?.balanceAvailable || 0) + (walletAny?.creditBalance || 0);

    if (!wallet || !walletAny || balance < price) {
        return 'insufficient';
    }

    // Charge wallet in transaction
    await db.$transaction(async (tx) => {
        // Row lock
        await tx.$queryRawUnsafe<unknown[]>(
            `SELECT "id" FROM "Wallet" WHERE "id" = $1 FOR UPDATE`,
            walletAny.id,
        );

        // Credit-first debit
        let creditUsed = 0;
        let realUsed = price;
        if (walletAny.creditBalance > 0) {
            creditUsed = Math.min(walletAny.creditBalance, price);
            realUsed = price - creditUsed;
        }

        await tx.wallet.update({
            where: { id: walletAny.id },
            data: {
                balanceAvailable: { decrement: realUsed },
                creditBalance: { decrement: creditUsed },
            },
        });

        await tx.walletLedger.create({
            data: {
                walletId: walletAny.id, userId: sub.userId!,
                type: 'SPEND', amount: price, direction: 'DEBIT',
                refType: 'SUBSCRIPTION', refId: sub.id,
                idempotencyKey: `sub_renew_${sub.id}_${now.toISOString().slice(0, 10)}`,
                note: `Gia hạn gói ${(plan as unknown as { name?: string })?.name || sub.planKey}`,
            },
        });

        // Extend period
        const newEnd = new Date(now);
        newEnd.setMonth(newEnd.getMonth() + 1);
        await tx.subscription.update({
            where: { id: sub.id },
            data: {
                currentPeriodEnd: newEnd,
                currentPeriodStart: now,
                status: 'ACTIVE',
                graceUntil: null, // clear grace if was PAST_DUE
            },
        });

        // Re-activate entitlements if were INACTIVE due to suspension
        await tx.entitlement.updateMany({
            where: {
                workspaceId: sub.workspaceId,
                status: 'INACTIVE',
                revokeReason: 'SUBSCRIPTION_SUSPENDED',
            },
            data: { status: 'ACTIVE', revokeReason: null, revokedAt: null },
        });

        // Receipt
        const receiptNo = `EMK-${now.toISOString().slice(0, 10).replace(/-/g, '')}-SUB${sub.id.slice(-4).toUpperCase()}`;
        await tx.receipt.create({
            data: {
                userId: sub.userId!, type: 'SUBSCRIPTION', amount: price,
                description: `Gia hạn ${(plan as unknown as { name?: string })?.name || sub.planKey}`,
                receiptNo,
            },
        });
    });

    return 'renewed';
}
