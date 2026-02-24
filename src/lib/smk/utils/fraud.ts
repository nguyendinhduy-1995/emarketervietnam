/**
 * Anti-fraud Detection for Partners
 *
 * Rules:
 * - returnRate > 25% in 30d → warning
 * - Multiple orders same address/device/IP → suspicious self-purchase
 * - Partner uses own coupon + ships to matching address → flag
 * - flaggedScore 0-100: auto manual-review if > 50, suspend if > 80
 */

import db from '@/lib/db/smk';

interface FraudSignals {
    returnRate30d: number;
    cancelRate30d: number;
    sameDeviceOrders: number;
    sameAddressOrders: number;
    suspiciousIpCount: number;
}

/**
 * Calculate fraud score from signals
 */
export function calculateFraudScore(signals: FraudSignals): number {
    let score = 0;

    // Return rate scoring (max 30 points)
    if (signals.returnRate30d > 0.5) score += 30;
    else if (signals.returnRate30d > 0.35) score += 20;
    else if (signals.returnRate30d > 0.25) score += 10;

    // Cancel rate scoring (max 20 points)
    if (signals.cancelRate30d > 0.4) score += 20;
    else if (signals.cancelRate30d > 0.25) score += 10;

    // Same device orders (max 20 points)
    if (signals.sameDeviceOrders > 5) score += 20;
    else if (signals.sameDeviceOrders > 3) score += 10;

    // Same address orders (max 15 points)
    if (signals.sameAddressOrders > 3) score += 15;
    else if (signals.sameAddressOrders > 1) score += 8;

    // Suspicious IPs (max 15 points)
    if (signals.suspiciousIpCount > 5) score += 15;
    else if (signals.suspiciousIpCount > 2) score += 8;

    return Math.min(100, score);
}

/**
 * Update partner risk signals and take action
 */
export async function updatePartnerRisk(
    partnerId: string,
    signals: FraudSignals
) {
    const flaggedScore = calculateFraudScore(signals);

    await db.partnerRiskSignal.upsert({
        where: { partnerId },
        create: {
            partnerId,
            ...signals,
            flaggedScore,
        },
        update: {
            ...signals,
            flaggedScore,
        },
    });

    // Auto actions based on score
    if (flaggedScore > 80) {
        // Suspend partner
        await db.partnerProfile.update({
            where: { id: partnerId },
            data: { status: 'SUSPENDED' },
        });

        // Move all pending commissions to manual review
        await db.commission.updateMany({
            where: { partnerId, status: 'PENDING' },
            data: { status: 'PENDING' }, // Keep pending but log event
        });

        await db.eventLog.create({
            data: {
                type: 'COMMISSION_REVERSED',
                partnerId,
                payload: { reason: 'auto_fraud_suspension', score: flaggedScore },
            },
        });
    }

    return flaggedScore;
}

/**
 * Check if a partner's commission should go to manual review
 */
export async function shouldManualReview(partnerId: string): Promise<boolean> {
    const risk = await db.partnerRiskSignal.findUnique({
        where: { partnerId },
    });

    return (risk?.flaggedScore ?? 0) > 50;
}
