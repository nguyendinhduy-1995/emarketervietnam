/**
 * Entitlement Management — Hub Integration
 *
 * Verifies Ed25519/HMAC signed entitlement snapshots from Hub.
 * Caches in-memory for fast feature checks.
 */
import crypto from 'crypto';

// ── Types ──────────────────────────────────────────────────

export interface FeatureInfo {
    enabled: boolean;
    tier: string;
    status?: string;
    expiresAt: string | null;
}

export interface EntitlementSnapshot {
    workspaceId: string;
    instanceId: string;
    boundDomain: string;
    productKey: string;
    features: Record<string, FeatureInfo>;
    subscription: {
        status: string;
        planKey: string;
        currentPeriodEnd?: string;
    } | null;
    isSuspended: boolean;
    isPastDue: boolean;
    generatedAt: string;
    expiresAt: string;
    pushReason: string;
    v: number;
}

// ── Feature Keys ───────────────────────────────────────────

export const FeatureKey = {
    // Core (always on with base plan)
    ESTUDIO_CORE: 'ESTUDIO_CORE',
    ESTUDIO_TEMPLATES: 'ESTUDIO_TEMPLATES',
    ESTUDIO_HISTORY: 'ESTUDIO_HISTORY',

    // Add-ons
    ESTUDIO_BATCH: 'ESTUDIO_BATCH',
    ESTUDIO_YOUTUBE: 'ESTUDIO_YOUTUBE',
    ESTUDIO_FASHION: 'ESTUDIO_FASHION',
    ESTUDIO_IMAGE_GEN: 'ESTUDIO_IMAGE_GEN',
    ESTUDIO_VIDEO_GEN: 'ESTUDIO_VIDEO_GEN',
    ESTUDIO_CLONE: 'ESTUDIO_CLONE',
    ESTUDIO_EXPORT: 'ESTUDIO_EXPORT',
} as const;

export const CORE_FEATURES: Set<string> = new Set([
    FeatureKey.ESTUDIO_CORE,
    FeatureKey.ESTUDIO_TEMPLATES,
    FeatureKey.ESTUDIO_HISTORY,
]);

export const FEATURE_LABELS: Record<string, string> = {
    [FeatureKey.ESTUDIO_CORE]: 'Studio cơ bản',
    [FeatureKey.ESTUDIO_TEMPLATES]: 'Mẫu kịch bản',
    [FeatureKey.ESTUDIO_HISTORY]: 'Lịch sử kịch bản',
    [FeatureKey.ESTUDIO_BATCH]: 'Tạo hàng loạt',
    [FeatureKey.ESTUDIO_YOUTUBE]: 'YouTube Creator',
    [FeatureKey.ESTUDIO_FASHION]: 'Thời trang AI',
    [FeatureKey.ESTUDIO_IMAGE_GEN]: 'Tạo ảnh AI',
    [FeatureKey.ESTUDIO_VIDEO_GEN]: 'Tạo video AI',
    [FeatureKey.ESTUDIO_CLONE]: 'Nhân bản kịch bản',
    [FeatureKey.ESTUDIO_EXPORT]: 'Xuất file',
};

// ── In-Memory Cache ────────────────────────────────────────

let cachedSnapshot: EntitlementSnapshot | null = null;

export function getCachedSnapshot(): EntitlementSnapshot | null {
    if (!cachedSnapshot) return null;
    if (new Date(cachedSnapshot.expiresAt) < new Date()) {
        cachedSnapshot = null;
        return null;
    }
    return cachedSnapshot;
}

export function setCachedSnapshot(snapshot: EntitlementSnapshot): void {
    cachedSnapshot = snapshot;
}

/**
 * Check if a feature is enabled.
 * Core features are always enabled.
 */
export function hasFeature(key: string): boolean {
    if (CORE_FEATURES.has(key)) return true;

    const snapshot = getCachedSnapshot();
    if (!snapshot) return false;

    // If suspended, only core features work
    if (snapshot.isSuspended) return false;

    return snapshot.features[key]?.enabled === true;
}

/**
 * Check if the app is in suspended mode (read-only).
 */
export function isSuspended(): boolean {
    return getCachedSnapshot()?.isSuspended ?? false;
}

// ── Signature Verification ─────────────────────────────────

/**
 * Verify Ed25519 signature from Hub.
 */
export function verifyEd25519(payload: object, signature: string): boolean {
    const publicKeyB64 = process.env.ENTITLEMENT_PUBLIC_KEY;
    if (!publicKeyB64) return false;

    try {
        const publicKeyPem = Buffer.from(publicKeyB64, 'base64').toString('utf-8');
        const data = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
        return crypto.verify(null, Buffer.from(data), publicKeyPem, Buffer.from(signature, 'base64'));
    } catch {
        return false;
    }
}

/**
 * Verify HMAC-SHA256 signature (fallback).
 */
export function verifyHmac(payload: object, signature: string): boolean {
    const secret = process.env.ENTITLEMENT_SECRET || 'entitlement-signing-key';
    const data = JSON.stringify(payload);
    const expected = crypto.createHmac('sha256', secret).update(data).digest('hex');
    try {
        return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
        return false;
    }
}

/**
 * Verify snapshot signature using either Ed25519 or HMAC.
 */
export function verifySignature(snapshot: object, signature: string, algorithm: string): boolean {
    if (algorithm === 'ed25519') return verifyEd25519(snapshot, signature);
    return verifyHmac(snapshot, signature);
}
