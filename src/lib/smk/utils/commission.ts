/**
 * Commission Engine
 *
 * Formula: commission = (orderSubtotal - discountAllocations - returnAmount) × rulePercent
 * - Excludes shipping fee
 * - If coupon belongs to a partner → attribute to that partner
 * - Return: reverse proportional to line-item return
 * - Flow: PENDING → (hold until return window) → AVAILABLE → PAID
 */

import db from '@/lib/db/smk';

interface CommissionInput {
    orderId: string;
    partnerId: string;
    orderSubtotal: number;
    discountTotal: number;
    partnerLevel: 'AFFILIATE' | 'AGENT' | 'LEADER';
    productIds?: string[];
    categoryIds?: string[];
}

interface CommissionResult {
    amount: number;
    ruleId: string;
    percent: number;
}

/**
 * Find the best matching commission rule (most specific wins)
 * Priority: PRODUCT > CATEGORY > GLOBAL
 */
export async function findBestRule(
    partnerLevel: string,
    productIds?: string[],
    categoryIds?: string[]
) {
    // 1. Try product-level rules
    if (productIds?.length) {
        const productRule = await db.commissionRule.findFirst({
            where: {
                scope: 'PRODUCT',
                scopeId: { in: productIds },
                partnerLevel: partnerLevel as 'AFFILIATE' | 'AGENT' | 'LEADER',
                isActive: true,
            },
            orderBy: { percent: 'desc' },
        });
        if (productRule) return productRule;
    }

    // 2. Try category-level rules
    if (categoryIds?.length) {
        const categoryRule = await db.commissionRule.findFirst({
            where: {
                scope: 'CATEGORY',
                scopeId: { in: categoryIds },
                partnerLevel: partnerLevel as 'AFFILIATE' | 'AGENT' | 'LEADER',
                isActive: true,
            },
            orderBy: { percent: 'desc' },
        });
        if (categoryRule) return categoryRule;
    }

    // 3. Try level-specific global rule
    const levelGlobal = await db.commissionRule.findFirst({
        where: {
            scope: 'GLOBAL',
            partnerLevel: partnerLevel as 'AFFILIATE' | 'AGENT' | 'LEADER',
            isActive: true,
        },
    });
    if (levelGlobal) return levelGlobal;

    // 4. Fallback: any global rule
    return db.commissionRule.findFirst({
        where: {
            scope: 'GLOBAL',
            partnerLevel: null,
            isActive: true,
        },
    });
}

/**
 * Calculate commission for an order
 */
export async function calculateCommission(
    input: CommissionInput
): Promise<CommissionResult | null> {
    const rule = await findBestRule(
        input.partnerLevel,
        input.productIds,
        input.categoryIds
    );

    if (!rule) return null;

    const commissionableAmount = input.orderSubtotal - input.discountTotal;
    const amount = Math.round(commissionableAmount * (rule.percent / 100));

    // Add fixed bonus if rule has one
    const total = amount + (rule.fixed || 0);

    return {
        amount: Math.max(0, total),
        ruleId: rule.id,
        percent: rule.percent,
    };
}

/**
 * Calculate partial reversal for a return
 * Reverses proportional to the returned line-item value
 */
export function calculateReversal(
    originalCommission: number,
    orderSubtotal: number,
    returnAmount: number
): number {
    if (orderSubtotal === 0) return 0;
    const ratio = returnAmount / orderSubtotal;
    return Math.round(originalCommission * ratio);
}

/**
 * Hold period in days before commission becomes available
 * (matches return window)
 */
export const COMMISSION_HOLD_DAYS = 14;

export function getHoldUntilDate(): Date {
    const date = new Date();
    date.setDate(date.getDate() + COMMISSION_HOLD_DAYS);
    return date;
}
