import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { type TokenPayload } from '@/lib/auth/jwt';
import { CORE_FEATURES, FEATURE_LABELS } from '@/lib/features/registry';

/**
 * Check if a workspace has an active entitlement for a given feature key.
 * Core features always return true.
 * Returns the entitlement record if found, or null.
 */
export async function checkEntitlement(
    workspaceId: string,
    moduleKey: string,
): Promise<{ allowed: boolean; entitlement?: Record<string, unknown> }> {
    // Core features are always allowed
    if (CORE_FEATURES.has(moduleKey)) {
        return { allowed: true };
    }

    const now = new Date();
    const entitlement = await platformDb.entitlement.findFirst({
        where: {
            workspaceId,
            moduleKey,
            status: 'ACTIVE',
            activeFrom: { lte: now },
            OR: [
                { activeTo: null },
                { activeTo: { gt: now } },
            ],
        },
        orderBy: { precedenceLevel: 'desc' }, // highest precedence wins
    });

    if (!entitlement) {
        return { allowed: false };
    }

    return {
        allowed: true,
        entitlement: entitlement as unknown as Record<string, unknown>,
    };
}

/**
 * API guard: require entitlement for a workspace.
 * Returns 403 with upgrade info if not entitled.
 *
 * Usage:
 *   const gate = await requireEntitlement(workspaceId, FeatureKey.AUTOMATION);
 *   if (gate instanceof NextResponse) return gate;
 */
export async function requireEntitlement(
    workspaceId: string | null,
    moduleKey: string,
): Promise<{ allowed: true; entitlement?: Record<string, unknown> } | NextResponse> {
    // Core features always pass
    if (CORE_FEATURES.has(moduleKey)) {
        return { allowed: true };
    }

    if (!workspaceId) {
        return NextResponse.json({
            error: 'Workspace không xác định',
            code: 'NO_WORKSPACE',
        }, { status: 400 });
    }

    const result = await checkEntitlement(workspaceId, moduleKey);
    if (!result.allowed) {
        const label = FEATURE_LABELS[moduleKey] || moduleKey;
        return NextResponse.json({
            error: `Tính năng "${label}" chưa được kích hoạt. Vui lòng nâng cấp gói dịch vụ.`,
            code: 'FEATURE_DISABLED',
            feature: moduleKey,
            upgradeUrl: '/hub/marketplace',
        }, { status: 403 });
    }

    return { allowed: true, entitlement: result.entitlement };
}

/**
 * Get all active entitlements for a workspace (for UI gating).
 */
export async function getWorkspaceEntitlements(workspaceId: string) {
    const now = new Date();
    return platformDb.entitlement.findMany({
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
            featureFlags: true,
            limits: true,
            activeFrom: true,
            activeTo: true,
            precedenceLevel: true,
        },
    });
}

/**
 * Helper: resolve workspaceId from user (for use in routes).
 */
export async function resolveUserWorkspace(userId: string): Promise<string | null> {
    const membership = await platformDb.membership.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' },
    });
    return membership?.workspaceId ?? null;
}
