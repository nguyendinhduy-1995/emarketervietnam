import { NextResponse } from 'next/server';
import { getTenantFeatures, FEATURE_KEYS, FEATURE_META, type FeatureKey } from '@/lib/smk/features/flags';

// GET /api/smk/admin/features — returns enabled features with full metadata
export async function GET() {
    const config = getTenantFeatures();

    const allFeatures = Object.keys(FEATURE_KEYS).map(key => {
        const k = key as FeatureKey;
        const meta = FEATURE_META[k];
        return {
            key: k,
            label: meta.label,
            icon: meta.icon,
            desc: meta.desc,
            longDesc: meta.longDesc,
            impact: meta.impact,
            category: meta.category,
            price: meta.price,
            highlights: meta.highlights,
            enabled: config.enabledFeatures.includes(k),
        };
    });

    return NextResponse.json({
        features: config.enabledFeatures,
        limits: config.limits || {},
        all: allFeatures,
    });
}
