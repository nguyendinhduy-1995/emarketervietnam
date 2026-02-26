import { platformDb } from '@/lib/db/platform';
import { CORE_FEATURES } from '@/lib/features/registry';

/**
 * In-memory entitlement cache per workspace.
 * TTL: 60 seconds. Invalidated by workspace or globally.
 */
interface CacheEntry {
    keys: Set<string>;
    limits: Map<string, Record<string, unknown>>;
    flags: Map<string, Record<string, unknown>>;
    expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 1 minute
const cache = new Map<string, CacheEntry>();

/**
 * Get cached entitlement keys for a workspace.
 */
export async function getCachedEntitlements(workspaceId: string): Promise<CacheEntry> {
    const now = Date.now();
    const existing = cache.get(workspaceId);
    if (existing && existing.expiresAt > now) {
        return existing;
    }

    // Fetch from DB
    const nowDate = new Date();
    const entitlements = await platformDb.entitlement.findMany({
        where: {
            workspaceId,
            status: 'ACTIVE',
            activeFrom: { lte: nowDate },
            OR: [
                { activeTo: null },
                { activeTo: { gt: nowDate } },
            ],
        },
    });

    const keys = new Set(entitlements.map(e => e.moduleKey));
    // Add core features
    for (const core of CORE_FEATURES) keys.add(core);

    const limits = new Map<string, Record<string, unknown>>();
    const flags = new Map<string, Record<string, unknown>>();
    for (const e of entitlements) {
        if (e.limits) limits.set(e.moduleKey, e.limits as Record<string, unknown>);
        if (e.featureFlags) flags.set(e.moduleKey, e.featureFlags as Record<string, unknown>);
    }

    const entry: CacheEntry = { keys, limits, flags, expiresAt: now + CACHE_TTL_MS };
    cache.set(workspaceId, entry);
    return entry;
}

/**
 * Check if workspace has feature (cached).
 */
export async function hasFeatureCached(workspaceId: string, featureKey: string): Promise<boolean> {
    if (CORE_FEATURES.has(featureKey)) return true;
    const entry = await getCachedEntitlements(workspaceId);
    return entry.keys.has(featureKey);
}

/**
 * Invalidate cache for a workspace (call after grant/revoke).
 */
export function invalidateEntitlementCache(workspaceId: string) {
    cache.delete(workspaceId);
}

/**
 * Invalidate all caches (e.g., after bulk operations).
 */
export function invalidateAllEntitlementCache() {
    cache.clear();
}
