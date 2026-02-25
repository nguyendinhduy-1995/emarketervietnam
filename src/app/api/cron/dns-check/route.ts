import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import dns from 'dns/promises';

/**
 * POST /api/cron/dns-check
 * 
 * Background cron: retries DNS verification for PENDING records.
 * Called every 15 minutes by external cron.
 * 
 * Auto-verifies domains, auto-expires stale tokens.
 */
export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret');
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    let verified = 0;
    let expired = 0;
    let checked = 0;

    // 1. Expire stale verifications
    const stale = await db.dnsVerification.updateMany({
        where: {
            status: 'PENDING',
            expiresAt: { lt: now },
        },
        data: { status: 'EXPIRED' },
    });
    expired = stale.count;

    // 2. Check pending verifications (max 20 per run to avoid timeouts)
    const pending = await db.dnsVerification.findMany({
        where: {
            status: 'PENDING',
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: now } },
            ],
        },
        orderBy: { lastCheckedAt: 'asc' }, // oldest first
        take: 20,
    });

    for (const v of pending) {
        checked++;
        const txtHost = `_emk-verify.${v.domain}`;

        try {
            const txtRecords = await dns.resolveTxt(txtHost);
            const flatRecords = txtRecords.map(r => r.join(''));
            const found = flatRecords.includes(v.verifyToken);

            if (found) {
                await db.dnsVerification.update({
                    where: { id: v.id },
                    data: {
                        status: 'VERIFIED',
                        verifiedAt: now,
                        lastCheckedAt: now,
                        attempts: { increment: 1 },
                    },
                });

                await db.eventLog.create({
                    data: {
                        workspaceId: v.workspaceId,
                        type: 'DNS_VERIFIED_AUTO',
                        payloadJson: { domain: v.domain, verificationId: v.id },
                    },
                });

                verified++;
            } else {
                await db.dnsVerification.update({
                    where: { id: v.id },
                    data: { lastCheckedAt: now, attempts: { increment: 1 } },
                });
            }
        } catch {
            // DNS lookup failed — just update lastCheckedAt
            await db.dnsVerification.update({
                where: { id: v.id },
                data: { lastCheckedAt: now, attempts: { increment: 1 } },
            });
        }
    }

    return NextResponse.json({
        ok: true,
        checked, verified, expired,
        runAt: now.toISOString(),
    });
}
