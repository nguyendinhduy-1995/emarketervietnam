import crypto from 'crypto';
import { platformDb } from '@/lib/db/platform';

/**
 * Signed Entitlement Snapshot
 * 
 * Hub signs workspace entitlements with HMAC-SHA256.
 * CRM/App verifies the signature offline — no DB call needed.
 * 
 * Snapshot TTL = 1 hour (revalidate periodically).
 */

const SIGNING_KEY = process.env.ENTITLEMENT_SIGNING_KEY || 'dev-entitlement-signing-key';
const SNAPSHOT_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface EntitlementSnapshot {
    workspaceId: string;
    entitlements: Array<{
        moduleKey: string;
        scope: string;
        status: string;
        featureFlags: unknown;
        limits: unknown;
        activeFrom: string;
        activeTo: string | null;
    }>;
    issuedAt: string;
    expiresAt: string;
    version: number; // increment on entitlement change for cache busting
}

export interface SignedEntitlement {
    snapshot: EntitlementSnapshot;
    signature: string;
}

/**
 * Build + sign entitlement snapshot for a workspace.
 */
export async function signEntitlementSnapshot(workspaceId: string): Promise<SignedEntitlement> {
    const now = new Date();

    // Fetch all active entitlements for this workspace
    const entitlements = await platformDb.entitlement.findMany({
        where: {
            workspaceId,
            status: 'ACTIVE',
            activeFrom: { lte: now },
            OR: [
                { activeTo: null },
                { activeTo: { gt: now } },
            ],
        },
        orderBy: { precedenceLevel: 'desc' },
        select: {
            moduleKey: true,
            scope: true,
            status: true,
            featureFlags: true,
            limits: true,
            activeFrom: true,
            activeTo: true,
            meta: true,
        },
    });

    const snapshot: EntitlementSnapshot = {
        workspaceId,
        entitlements: entitlements.map(e => ({
            moduleKey: e.moduleKey,
            scope: e.scope,
            status: e.status,
            featureFlags: e.featureFlags,
            limits: e.limits,
            activeFrom: e.activeFrom.toISOString(),
            activeTo: e.activeTo?.toISOString() ?? null,
        })),
        issuedAt: now.toISOString(),
        expiresAt: new Date(now.getTime() + SNAPSHOT_TTL_MS).toISOString(),
        version: entitlements.length, // simple version based on count
    };

    const signature = hmacSign(snapshot);

    return { snapshot, signature };
}

/**
 * Verify a signed snapshot.
 * Returns { valid, reason } — CRM/App can call this endpoint or verify locally.
 */
export function verifyEntitlementSignature(
    snapshot: EntitlementSnapshot,
    signature: string,
): { valid: boolean; reason?: string } {
    // 1. Verify HMAC signature
    const expectedSignature = hmacSign(snapshot);
    const isValidSig = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex'),
    );
    if (!isValidSig) {
        return { valid: false, reason: 'INVALID_SIGNATURE' };
    }

    // 2. Check expiry
    const expiresAt = new Date(snapshot.expiresAt);
    if (expiresAt < new Date()) {
        return { valid: false, reason: 'SNAPSHOT_EXPIRED' };
    }

    return { valid: true };
}

/**
 * Check if a specific moduleKey is entitled in a signed snapshot.
 * For CRM/App to use after verifying the signature.
 */
export function isEntitled(snapshot: EntitlementSnapshot, moduleKey: string): boolean {
    return snapshot.entitlements.some(
        e => e.moduleKey === moduleKey && e.status === 'ACTIVE'
    );
}

// ── Internal HMAC helper ────────────────────────────────────

function hmacSign(snapshot: EntitlementSnapshot): string {
    // Deterministic JSON: sort keys for consistent hashing
    const payload = JSON.stringify(snapshot, Object.keys(snapshot).sort());
    return crypto
        .createHmac('sha256', SIGNING_KEY)
        .update(payload)
        .digest('hex');
}
