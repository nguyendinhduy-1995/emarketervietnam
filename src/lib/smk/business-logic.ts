/**
 * Commission logic — pure business rules
 */
export const COMMISSION_RATES: Record<string, number> = {
    AFFILIATE: 5,
    AGENT: 8,
    LEADER: 12,
};

/**
 * Calculate commission for a partner.
 * @param netTotal - Order total AFTER discount (not subtotal)
 * @param partnerLevel - Partner tier: AFFILIATE | AGENT | LEADER
 */
export function calcCommission(netTotal: number, partnerLevel: string): number {
    const rate = COMMISSION_RATES[partnerLevel] ?? COMMISSION_RATES.AFFILIATE;
    return Math.round(netTotal * rate / 100);
}

export function isCommissionHoldExpired(holdUntil: Date): boolean {
    return new Date() > holdUntil;
}

export type CommissionStatus = 'PENDING' | 'AVAILABLE' | 'PAID' | 'REVERSED';

export function canReleaseCommission(status: CommissionStatus, holdUntil: Date): boolean {
    if (status !== 'PENDING') return false;
    return isCommissionHoldExpired(holdUntil);
}

/**
 * Risk score calculation
 */
export interface FraudSignals {
    returnRate: number;   // percent
    cancelRate: number;   // percent
    sameDevice: number;   // count
    sameAddress: number;  // count
    selfPurchase: number; // count
    ipOverlap: number;    // count
}

export function calcRiskScore(signals: FraudSignals): number {
    let score = 0;
    if (signals.returnRate > 25) score += 30;
    else if (signals.returnRate > 15) score += 15;
    if (signals.cancelRate > 20) score += 20;
    else if (signals.cancelRate > 10) score += 10;
    score += signals.sameDevice * 5;
    score += signals.sameAddress * 3;
    score += signals.selfPurchase * 10;
    score += signals.ipOverlap * 5;
    return Math.min(score, 100);
}

export function shouldHoldCommission(riskScore: number): boolean {
    return riskScore > 40;
}

/**
 * Attribution logic
 */
export function resolvePartnerFromRef(refCode: string | null, couponPartnerCode: string | null): string | null {
    // Coupon partner takes priority over ref link
    if (couponPartnerCode) return couponPartnerCode;
    if (refCode) return refCode;
    return null;
}

/**
 * Inventory logic
 */
export function canDecrementStock(currentStock: number, qty: number): boolean {
    return currentStock >= qty && qty > 0;
}

export function decrementStock(currentStock: number, qty: number): number {
    if (!canDecrementStock(currentStock, qty)) {
        throw new Error(`Insufficient stock: have ${currentStock}, need ${qty}`);
    }
    return currentStock - qty;
}

export function restoreStock(currentStock: number, qty: number): number {
    if (qty <= 0) throw new Error('Restore qty must be positive');
    return currentStock + qty;
}

/**
 * RBAC logic
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: ['*'],
    STORE_MANAGER: ['products', 'orders', 'customers', 'shipping', 'returns', 'warehouse', 'reviews', 'support'],
    STAFF: ['orders', 'customers', 'support'],
};

export function hasPermission(role: string, requiredPermission: string, userPermissions?: string[] | null): boolean {
    const rolePerms = ROLE_PERMISSIONS[role] || [];
    if (rolePerms.includes('*')) return true;
    // User-level overrides
    if (userPermissions && userPermissions.includes(requiredPermission)) return true;
    return rolePerms.includes(requiredPermission);
}

export function getAccessibleRoutes(role: string): string[] {
    return ROLE_PERMISSIONS[role] || [];
}
