'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface FeatureInfo {
    enabled: boolean;
    label: string;
}

interface EntitlementState {
    features: Record<string, FeatureInfo>;
    suspended: boolean;
    loading: boolean;
    hasFeature: (key: string) => boolean;
    planKey: string | null;
}

const EntitlementContext = createContext<EntitlementState>({
    features: {},
    suspended: false,
    loading: true,
    hasFeature: () => false,
    planKey: null,
});

export function EntitlementProvider({ children }: { children: ReactNode }) {
    const [features, setFeatures] = useState<Record<string, FeatureInfo>>({});
    const [suspended, setSuspended] = useState(false);
    const [loading, setLoading] = useState(true);
    const [planKey, setPlanKey] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/entitlement/status')
            .then(r => r.json())
            .then(d => {
                setFeatures(d.features || {});
                setSuspended(d.suspended || false);
                setPlanKey(d.planKey || null);
            })
            .catch(() => {
                // On error, enable core features only
            })
            .finally(() => setLoading(false));
    }, []);

    const hasFeature = (key: string) => {
        // Core features always enabled
        if (key.startsWith('ESTUDIO_CORE') || key === 'ESTUDIO_TEMPLATES' || key === 'ESTUDIO_HISTORY') {
            return true;
        }
        return features[key]?.enabled ?? false;
    };

    return (
        <EntitlementContext.Provider value={{ features, suspended, loading, hasFeature, planKey }}>
            {children}
        </EntitlementContext.Provider>
    );
}

export const useEntitlement = () => useContext(EntitlementContext);

// ── FeatureGate Component ──────────────────────────────────

interface FeatureGateProps {
    feature: string;
    children: ReactNode;
    fallback?: ReactNode;
    hideWhenDisabled?: boolean;
}

/**
 * <FeatureGate feature="ESTUDIO_YOUTUBE">
 *   <YouTubeCreator />
 * </FeatureGate>
 */
export function FeatureGate({ feature, children, fallback, hideWhenDisabled }: FeatureGateProps) {
    const { hasFeature: check, loading } = useEntitlement();

    if (loading) return null;
    if (check(feature)) return <>{children}</>;
    if (hideWhenDisabled) return null;

    if (fallback) return <>{fallback}</>;

    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emarketervietnam.vn';
    return (
        <div className="flex flex-col items-center justify-center p-12 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 my-4">
            <div className="text-4xl mb-3">🔒</div>
            <h3 className="text-lg font-bold mb-1">Tính năng bị khóa</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center max-w-sm">
                Nâng cấp gói để mở khóa tính năng này.
            </p>
            <a
                href={`${hubUrl}/hub/marketplace`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
            >
                🛒 Nâng cấp ngay
            </a>
        </div>
    );
}

/**
 * Inline version — hides completely if feature disabled.
 */
export function IfFeature({ feature, children }: { feature: string; children: ReactNode }) {
    return <FeatureGate feature={feature} hideWhenDisabled>{children}</FeatureGate>;
}
