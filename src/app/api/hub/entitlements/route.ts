import { NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { getWorkspaceEntitlements, resolveUserWorkspace } from '@/lib/auth/entitlement-guard';
import { CORE_FEATURES, FEATURE_TIER, FEATURE_LABELS } from '@/lib/features/registry';

// GET — returns workspace entitlements for UI gating
export async function GET() {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const workspaceId = await resolveUserWorkspace(session.userId);

    // Build feature map: all core features + active entitlements
    const featureMap: Record<string, {
        enabled: boolean;
        tier: string;
        label: string;
        limits?: unknown;
        featureFlags?: unknown;
        expiresAt?: string | null;
    }> = {};

    // Core features always enabled
    for (const key of CORE_FEATURES) {
        featureMap[key] = {
            enabled: true,
            tier: 'CORE',
            label: FEATURE_LABELS[key] || key,
        };
    }

    // Add-on features: check entitlements
    if (workspaceId) {
        const entitlements = await getWorkspaceEntitlements(workspaceId);
        const entitledKeys = new Set(entitlements.map(e => e.moduleKey));

        for (const [key, tier] of Object.entries(FEATURE_TIER)) {
            if (tier === 'CORE') continue; // already added
            const ent = entitlements.find(e => e.moduleKey === key);
            featureMap[key] = {
                enabled: entitledKeys.has(key),
                tier,
                label: FEATURE_LABELS[key] || key,
                limits: ent?.limits ?? undefined,
                featureFlags: ent?.featureFlags ?? undefined,
                expiresAt: ent?.activeTo?.toISOString() ?? null,
            };
        }
    } else {
        // No workspace — all add-ons disabled
        for (const [key, tier] of Object.entries(FEATURE_TIER)) {
            if (tier === 'CORE') continue;
            featureMap[key] = {
                enabled: false,
                tier,
                label: FEATURE_LABELS[key] || key,
            };
        }
    }

    return NextResponse.json({
        workspaceId,
        features: featureMap,
    });
}
