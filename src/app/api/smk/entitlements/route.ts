import { NextRequest, NextResponse } from 'next/server';
import { resetFeatureCache, FEATURE_KEYS, type FeatureKey } from '@/lib/smk/features/flags';

// ─── GET /api/entitlements ────────────────────────────────
// Fetch entitlements from Hub or return current cached state
// Called by CRM runtime to know which features are enabled

const HUB_URL = process.env.HUB_URL || 'http://localhost:3000';
const HUB_API_KEY = process.env.HUB_API_KEY || '';

// In-memory cache of entitlements from Hub
let _hubEntitlements: FeatureKey[] | null = null;
let _hubCacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
    // If SMK_FEATURES env is set, use that (dev/override mode)
    const envOverride = process.env.SMK_FEATURES;
    if (envOverride) {
        const allKeys = Object.keys(FEATURE_KEYS) as FeatureKey[];
        let features: FeatureKey[];
        if (envOverride === 'ALL') features = allKeys;
        else if (envOverride === 'NONE') features = [];
        else features = envOverride.split(',').map(k => k.trim()).filter(k => k in FEATURE_KEYS) as FeatureKey[];

        return NextResponse.json({
            source: 'env',
            features,
            total: allKeys.length,
            enabled: features.length,
        });
    }

    // Check cache
    if (_hubEntitlements && Date.now() < _hubCacheExpiry) {
        return NextResponse.json({
            source: 'cache',
            features: _hubEntitlements,
            total: Object.keys(FEATURE_KEYS).length,
            enabled: _hubEntitlements.length,
        });
    }

    // Fetch from Hub
    try {
        const res = await fetch(`${HUB_URL}/api/hub/entitlements/smk`, {
            headers: {
                'Authorization': `Bearer ${HUB_API_KEY}`,
                'Content-Type': 'application/json',
            },
            next: { revalidate: 300 }, // ISR cache 5 min
        });

        if (res.ok) {
            const data = await res.json();
            _hubEntitlements = (data.features || []) as FeatureKey[];
            _hubCacheExpiry = Date.now() + CACHE_TTL;
            return NextResponse.json({
                source: 'hub',
                features: _hubEntitlements,
                total: Object.keys(FEATURE_KEYS).length,
                enabled: _hubEntitlements.length,
            });
        }
    } catch {
        // Hub unreachable — fallback to ALL features ON
    }

    // Fallback: all features ON
    const allKeys = Object.keys(FEATURE_KEYS) as FeatureKey[];
    return NextResponse.json({
        source: 'fallback',
        features: allKeys,
        total: allKeys.length,
        enabled: allKeys.length,
    });
}

// ─── POST /api/entitlements ───────────────────────────────
// Webhook from Hub when entitlement changes (purchase/cancel/expire)

export async function POST(req: NextRequest) {
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret');
    if (secret !== process.env.WEBHOOK_SECRET && process.env.WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Invalid webhook secret' }, { status: 401 });
    }

    const body = await req.json();
    const { action, features } = body;

    if (action === 'UPDATE_ENTITLEMENTS' && Array.isArray(features)) {
        _hubEntitlements = features.filter((k: string) => k in FEATURE_KEYS) as FeatureKey[];
        _hubCacheExpiry = Date.now() + CACHE_TTL;
        resetFeatureCache(); // Clear server-side cache
        return NextResponse.json({ ok: true, updated: _hubEntitlements.length });
    }

    if (action === 'CLEAR_CACHE') {
        _hubEntitlements = null;
        _hubCacheExpiry = 0;
        resetFeatureCache();
        return NextResponse.json({ ok: true, cacheCleared: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
