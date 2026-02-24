import { NextResponse } from 'next/server';
import { isFeatureEnabled, type FeatureKey, FEATURE_META } from './flags';

/**
 * API Gate: middleware guard for advanced feature endpoints.
 * Returns 403 with FEATURE_DISABLED code if feature is off.
 *
 * Usage in API route:
 *   const gate = requireFeature('ADV_AI');
 *   if (gate) return gate;
 */
export function requireFeature(key: FeatureKey): NextResponse | null {
    if (isFeatureEnabled(key)) return null;

    const meta = FEATURE_META[key];
    return NextResponse.json({
        error: `Tính năng "${meta.label}" chưa được kích hoạt`,
        code: 'FEATURE_DISABLED',
        feature: key,
        upgradeUrl: `/hub/marketplace?feature=${key}`,
    }, { status: 403 });
}

/**
 * Job Gate: check before running scheduled tasks.
 * Usage:
 *   if (!shouldRunJob('ADV_AUTOMATION')) return;
 */
export function shouldRunJob(key: FeatureKey): boolean {
    return isFeatureEnabled(key);
}
