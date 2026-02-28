import { NextResponse } from 'next/server';
import { getCachedSnapshot, hasFeature, FEATURE_LABELS, FeatureKey } from '@/lib/entitlement';

/**
 * GET /api/entitlement/status
 *
 * Returns current entitlement status for the client-side FeatureGate component.
 */
export async function GET() {
    const snapshot = getCachedSnapshot();

    if (!snapshot) {
        // No snapshot cached — return core features only
        const features: Record<string, { enabled: boolean; label: string }> = {};
        for (const [key, label] of Object.entries(FEATURE_LABELS)) {
            features[key] = {
                enabled: key.startsWith('ESTUDIO_CORE') || key === FeatureKey.ESTUDIO_TEMPLATES || key === FeatureKey.ESTUDIO_HISTORY,
                label,
            };
        }
        return NextResponse.json({ features, suspended: false, hasSnapshot: false });
    }

    const features: Record<string, { enabled: boolean; label: string }> = {};
    for (const [key, label] of Object.entries(FEATURE_LABELS)) {
        features[key] = {
            enabled: hasFeature(key),
            label,
        };
    }

    return NextResponse.json({
        features,
        suspended: snapshot.isSuspended,
        isPastDue: snapshot.isPastDue,
        planKey: snapshot.subscription?.planKey || null,
        hasSnapshot: true,
    });
}
