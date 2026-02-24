'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { FeatureKey } from './flags';

// ─── Client-side Feature Context ──────────────────────────

interface FeatureContextType {
    enabledFeatures: FeatureKey[];
    isEnabled: (key: FeatureKey) => boolean;
    loading: boolean;
}

const FeatureContext = createContext<FeatureContextType>({
    enabledFeatures: [],
    isEnabled: () => true, // default: enabled until loaded
    loading: true,
});

export function FeatureProvider({ children }: { children: ReactNode }) {
    const [enabledFeatures, setEnabledFeatures] = useState<FeatureKey[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/smk/admin/features')
            .then(r => r.ok ? r.json() : { features: [] })
            .then(d => {
                setEnabledFeatures(d.features || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const isEnabled = (key: FeatureKey) => {
        if (loading) return true; // show everything while loading
        return enabledFeatures.includes(key);
    };

    return (
        <FeatureContext.Provider value={{ enabledFeatures, isEnabled, loading }}>
            {children}
        </FeatureContext.Provider>
    );
}

export function useFeatures() {
    return useContext(FeatureContext);
}

// ─── IfFeature Gate Component ─────────────────────────────

interface IfFeatureProps {
    flag: FeatureKey;
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * UI Gate: renders children only if the feature is enabled.
 * Usage: <IfFeature flag="ADV_AI">...</IfFeature>
 */
export function IfFeature({ flag, children, fallback = null }: IfFeatureProps) {
    const { isEnabled } = useFeatures();
    return isEnabled(flag) ? <>{children}</> : <>{fallback}</>;
}

// ─── Feature Upsell Card ──────────────────────────────────

interface FeatureUpsellProps {
    featureKey: FeatureKey;
    featureName: string;
    featureIcon: string;
    featureDesc: string;
}

/**
 * Shows an upsell card when a feature is disabled.
 * Includes a "Mua thêm" button that links to Hub marketplace.
 */
export function FeatureUpsell({ featureKey, featureName, featureIcon, featureDesc }: FeatureUpsellProps) {
    return (
        <div style={{
            maxWidth: '480px', margin: '80px auto', textAlign: 'center',
            padding: '40px 24px', borderRadius: '20px',
            background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e5e7eb)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
        }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 8px' }}>
                {featureIcon} {featureName}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted, #6b7280)', marginBottom: '24px' }}>
                {featureDesc}
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary, #9ca3af)', marginBottom: '24px' }}>
                Tính năng này chưa được kích hoạt trong gói của bạn.
                Liên hệ để nâng cấp hoặc mua thêm tính năng.
            </p>
            <a
                href={`/hub/marketplace?feature=${featureKey}`}
                style={{
                    display: 'inline-block', padding: '12px 24px', borderRadius: '12px',
                    background: 'var(--gradient-gold, linear-gradient(135deg, #d4a853, #b8860b))',
                    color: '#fff', fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                    boxShadow: '0 4px 12px rgba(212,168,83,0.3)',
                }}
            >
                🛒 Mua thêm tính năng
            </a>
        </div>
    );
}
