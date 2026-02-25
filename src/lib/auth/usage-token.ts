import { SignJWT, jwtVerify } from 'jose';

/**
 * Usage Token — short-lived JWT for PAYG operations.
 * 
 * Flow: App calls Hub charge → Hub debits wallet → returns usageToken
 * → App runs job with token → App calls Hub complete → Hub finalizes.
 * 
 * Token is one-time (bound to eventId), TTL 30 minutes.
 */

const USAGE_SECRET = new TextEncoder().encode(
    process.env.USAGE_TOKEN_SECRET || 'dev-usage-token-secret'
);

export interface UsageTokenPayload {
    eventId: string;
    userId: string;
    workspaceId?: string;
    productId: string;
    itemKey: string;
    quantity: number;
    total: number; // VND charged/held
}

/**
 * Sign a usage token after successful wallet charge/hold.
 */
export async function signUsageToken(payload: UsageTokenPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('30m')
        .setSubject(payload.eventId)
        .sign(USAGE_SECRET);
}

/**
 * Verify a usage token.
 * Returns the payload or null if invalid/expired.
 */
export async function verifyUsageToken(token: string): Promise<UsageTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, USAGE_SECRET);
        return payload as unknown as UsageTokenPayload;
    } catch {
        return null;
    }
}
