import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { verifyUsageToken } from '@/lib/auth/usage-token';

/**
 * POST /api/hub/usage/complete
 * 
 * App reports job completion → Hub finalizes the charge.
 * 
 * Body: { eventId, usageToken, status: 'SUCCESS' | 'FAILED', resultMeta? }
 * 
 * SUCCESS → capture hold (finalize debit)
 * FAILED  → refund wallet + reverse ledger
 */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { eventId, usageToken, status, resultMeta } = body;

    if (!eventId || !usageToken || !status) {
        return NextResponse.json(
            { error: 'eventId, usageToken, status required' },
            { status: 400 },
        );
    }

    if (!['SUCCESS', 'FAILED'].includes(status)) {
        return NextResponse.json(
            { error: 'status must be SUCCESS or FAILED' },
            { status: 400 },
        );
    }

    // 1. Verify usage token
    const tokenPayload = await verifyUsageToken(usageToken);
    if (!tokenPayload) {
        return NextResponse.json(
            { error: 'Token không hợp lệ hoặc đã hết hạn', code: 'INVALID_TOKEN' },
            { status: 403 },
        );
    }

    // Token must match eventId (one-time binding)
    if (tokenPayload.eventId !== eventId) {
        return NextResponse.json(
            { error: 'Token không khớp với eventId', code: 'TOKEN_MISMATCH' },
            { status: 403 },
        );
    }

    // 2. Find the usage event
    const event = await db.usageEvent.findUnique({ where: { id: eventId } });
    if (!event) {
        return NextResponse.json({ error: 'Event không tồn tại' }, { status: 404 });
    }

    // Must be PENDING (not already completed)
    if (event.status !== 'PENDING') {
        return NextResponse.json({
            error: `Event đã được xử lý: ${event.status}`,
            code: 'ALREADY_PROCESSED',
        }, { status: 409 });
    }

    // 3. Finalize
    if (status === 'SUCCESS') {
        // Capture: just update event status (money already debited)
        await db.usageEvent.update({
            where: { id: eventId },
            data: {
                status: 'SUCCEEDED',
                metadata: {
                    ...(event.metadata as Record<string, unknown> || {}),
                    completedAt: new Date().toISOString(),
                    ...(resultMeta || {}),
                },
            },
        });

        // Update ledger entry from HOLD → CAPTURE
        const meta = event.metadata as Record<string, unknown> | null;
        const ledgerId = meta?.ledgerId as string | undefined;
        if (ledgerId) {
            await db.walletLedger.update({
                where: { id: ledgerId },
                data: { type: 'CAPTURE', note: `PAYG captured: ${event.meteredItemKey} x${event.quantity}` },
            });
        }

        return NextResponse.json({
            ok: true,
            eventId,
            status: 'SUCCEEDED',
            charged: event.total,
        });
    } else {
        // FAILED → Refund
        await db.$transaction(async (tx) => {
            // Update event
            await tx.usageEvent.update({
                where: { id: eventId },
                data: {
                    status: 'REVERSED',
                    metadata: {
                        ...(event.metadata as Record<string, unknown> || {}),
                        failedAt: new Date().toISOString(),
                        failReason: resultMeta?.reason || 'Job failed',
                    },
                },
            });

            // Refund wallet
            const wallet = await tx.wallet.findUnique({ where: { userId: event.userId } });
            if (wallet) {
                await tx.wallet.update({
                    where: { id: wallet.id },
                    data: { balanceAvailable: { increment: event.total } },
                });

                // Create refund ledger entry
                await tx.walletLedger.create({
                    data: {
                        walletId: wallet.id,
                        userId: event.userId,
                        type: 'REFUND',
                        amount: event.total,
                        direction: 'CREDIT',
                        refType: 'USAGE',
                        refId: eventId,
                        idempotencyKey: `payg_refund_${eventId}`,
                        note: `PAYG refund: ${event.meteredItemKey} job failed`,
                    },
                });
            }

            // Reverse quota if applicable
            const quota = await tx.usageQuota.findFirst({
                where: {
                    userId: event.userId,
                    productId: event.productId,
                    itemKey: event.meteredItemKey,
                    periodEnd: { gt: new Date() },
                },
            });
            if (quota && quota.quotaUsed > 0) {
                await tx.usageQuota.update({
                    where: { id: quota.id },
                    data: { quotaUsed: { decrement: Math.min(event.quantity, quota.quotaUsed) } },
                });
            }
        });

        return NextResponse.json({
            ok: true,
            eventId,
            status: 'REVERSED',
            refunded: event.total,
        });
    }
}
