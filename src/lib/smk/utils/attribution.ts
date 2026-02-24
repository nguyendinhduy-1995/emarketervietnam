/**
 * Attribution Engine
 *
 * Attribution priority:
 * 1. Coupon code owned by a partner → attribute to that partner (strongest)
 * 2. Last-click ref link within 7-day window (cookie/localStorage)
 * 3. Single attribution per order — no splitting
 */

import db from '@/lib/db/smk';

const ATTRIBUTION_WINDOW_DAYS = 7;

/**
 * Record a referral click → create AttributionSession
 */
export async function recordRefClick(
    partnerId: string,
    sessionId: string,
    userId?: string,
    source: 'REF_LINK' | 'QR' = 'REF_LINK'
) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + ATTRIBUTION_WINDOW_DAYS);

    // Upsert: if same session+partner exists, update lastTouch
    const existing = await db.attributionSession.findFirst({
        where: { sessionId, partnerId },
    });

    if (existing) {
        return db.attributionSession.update({
            where: { id: existing.id },
            data: { lastTouch: new Date(), expiresAt, userId: userId || existing.userId },
        });
    }

    return db.attributionSession.create({
        data: {
            sessionId,
            partnerId,
            userId,
            source,
            expiresAt,
        },
    });
}

/**
 * Resolve attribution for an order
 * Returns partnerId and attributionType
 */
export async function resolveAttribution(
    couponCode?: string,
    sessionId?: string,
    userId?: string
): Promise<{
    partnerId: string;
    attributionType: 'COUPON' | 'LAST_CLICK';
    attributionSessionId?: string;
} | null> {
    // 1. Coupon-based attribution (strongest)
    if (couponCode) {
        const coupon = await db.coupon.findUnique({
            where: { code: couponCode },
            include: { ownerPartner: true },
        });
        if (coupon?.ownerPartnerId && coupon.ownerPartner?.status === 'ACTIVE') {
            return {
                partnerId: coupon.ownerPartnerId,
                attributionType: 'COUPON',
            };
        }
    }

    // 2. Last-click attribution via session
    if (sessionId || userId) {
        const where: { expiresAt: { gt: Date }; userId?: string; sessionId?: string } = {
            expiresAt: { gt: new Date() },
        };

        // Prefer userId match over sessionId
        if (userId) {
            where.userId = userId;
        } else if (sessionId) {
            where.sessionId = sessionId;
        }

        const session = await db.attributionSession.findFirst({
            where,
            orderBy: { lastTouch: 'desc' },
            include: { partner: true },
        });

        if (session && session.partner.status === 'ACTIVE') {
            return {
                partnerId: session.partnerId,
                attributionType: 'LAST_CLICK',
                attributionSessionId: session.id,
            };
        }
    }

    return null;
}

/**
 * Create OrderReferral record for an order
 */
export async function createOrderReferral(
    orderId: string,
    partnerId: string,
    attributionType: 'COUPON' | 'LAST_CLICK',
    attributionSessionId?: string
) {
    return db.orderReferral.create({
        data: {
            orderId,
            partnerId,
            attributionType,
            attributionSessionId,
        },
    });
}
