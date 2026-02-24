import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/cron/subscription-renew
// Called by external cron — checks subscriptions past their period end
// Actions: charge wallet → extend period, or suspend if insufficient balance
export async function POST(req: NextRequest) {
    // Verify cron secret
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find subscriptions past their period end
    const due = await db.subscription.findMany({
        where: {
            status: { in: ['ACTIVE', 'TRIAL'] },
            currentPeriodEnd: { lt: now },
        },
        include: {
            workspace: { select: { name: true, orgId: true } },
        },
    });

    if (due.length === 0) {
        return NextResponse.json({ ok: true, renewed: 0, suspended: 0, message: 'No renewals due' });
    }

    let renewed = 0;
    let suspended = 0;
    const details: { id: string; userId: string; action: string; reason?: string }[] = [];

    for (const sub of due) {
        // Skip subscriptions without a user (shouldn't happen, but safety)
        const subUserId = sub.userId;
        if (!subUserId) continue;

        // Get plan price
        const plan = sub.planId ? await db.plan.findUnique({ where: { id: sub.planId } }) : null;
        const price = (plan as unknown as { price?: number })?.price || 0;

        if (price === 0) {
            // Free plan or no plan — just extend
            const newEnd = new Date(now);
            newEnd.setMonth(newEnd.getMonth() + 1);
            await db.subscription.update({
                where: { id: sub.id },
                data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
            });
            renewed++;
            details.push({ id: sub.id, userId: subUserId, action: 'renewed_free' });
            continue;
        }

        // Check wallet
        const wallet = await db.wallet.findUnique({ where: { userId: subUserId } });
        const walletAny = wallet as unknown as { id: string; balanceAvailable: number; creditBalance: number } | null;
        const balance = (walletAny?.balanceAvailable || 0) + (walletAny?.creditBalance || 0);

        if (!wallet || !walletAny || balance < price) {
            // Insufficient balance — suspend
            await db.subscription.update({
                where: { id: sub.id },
                data: { status: 'PAST_DUE' },
            });

            // Notify user
            await db.notificationQueue.create({
                data: {
                    userId: subUserId,
                    type: 'SUB_EXPIRING',
                    title: 'Gói dịch vụ sắp bị tạm ngưng',
                    body: `Số dư ví không đủ (${balance.toLocaleString()}đ / ${price.toLocaleString()}đ). Vui lòng nạp thêm để duy trì dịch vụ.`,
                    referenceType: 'SUBSCRIPTION',
                    referenceId: sub.id,
                },
            });

            suspended++;
            details.push({ id: sub.id, userId: subUserId, action: 'suspended', reason: `balance ${balance} < price ${price}` });
            continue;
        }

        // Charge wallet in transaction
        await db.$transaction(async (tx) => {
            // Row lock
            await tx.$queryRawUnsafe<unknown[]>(
                `SELECT "id" FROM "Wallet" WHERE "id" = $1 FOR UPDATE`,
                walletAny.id
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
                    walletId: walletAny.id, userId: subUserId,
                    type: 'SPEND', amount: price, direction: 'DEBIT',
                    refType: 'SUBSCRIPTION', refId: sub.id,
                    idempotencyKey: `sub_renew_${sub.id}_${now.toISOString().slice(0, 7)}`,
                    note: `Gia hạn gói ${(plan as unknown as { name?: string })?.name || sub.planKey}`,
                },
            });

            // Extend period
            const newEnd = new Date(now);
            newEnd.setMonth(newEnd.getMonth() + 1);
            await tx.subscription.update({
                where: { id: sub.id },
                data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
            });

            // Receipt
            const receiptNo = `EMK-${now.toISOString().slice(0, 10).replace(/-/g, '')}-SUB${sub.id.slice(-4).toUpperCase()}`;
            await tx.receipt.create({
                data: {
                    userId: subUserId, type: 'SUBSCRIPTION', amount: price,
                    description: `Gia hạn ${(plan as unknown as { name?: string })?.name || sub.planKey}`,
                    receiptNo,
                },
            });
        });

        renewed++;
        details.push({ id: sub.id, userId: subUserId, action: 'renewed_paid' });
    }

    return NextResponse.json({
        ok: true, renewed, suspended,
        details,
        runAt: now.toISOString(),
    });
}
