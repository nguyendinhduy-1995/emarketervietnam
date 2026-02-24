'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface FeatureInfo {
    enabled: boolean;
    tier: string;
    label: string;
    limits?: Record<string, unknown>;
    featureFlags?: Record<string, unknown>;
    expiresAt?: string | null;
}

interface EntitlementState {
    loading: boolean;
    features: Record<string, FeatureInfo>;
    workspaceId: string | null;
    hasFeature: (key: string) => boolean;
    getLimit: (key: string, limitKey: string) => number | null;
    getFlag: (key: string, flagKey: string) => boolean;
    refresh: () => Promise<void>;
}

const EntitlementContext = createContext<EntitlementState>({
    loading: true,
    features: {},
    workspaceId: null,
    hasFeature: () => false,
    getLimit: () => null,
    getFlag: () => false,
    refresh: async () => { },
});

export function EntitlementProvider({ children }: { children: ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [features, setFeatures] = useState<Record<string, FeatureInfo>>({});
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);

    const fetchEntitlements = async () => {
        try {
            const res = await fetch('/api/hub/entitlements');
            if (!res.ok) return;
            const data = await res.json();
            setFeatures(data.features || {});
            setWorkspaceId(data.workspaceId || null);
        } catch {
            // Silently fail — features stay empty = all add-ons disabled
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntitlements();
    }, []);

    const hasFeature = (key: string): boolean => {
        const f = features[key];
        if (!f) return false;
        return f.enabled;
    };

    const getLimit = (key: string, limitKey: string): number | null => {
        const f = features[key];
        if (!f?.limits) return null;
        const val = (f.limits as Record<string, unknown>)[limitKey];
        return typeof val === 'number' ? val : null;
    };

    const getFlag = (key: string, flagKey: string): boolean => {
        const f = features[key];
        if (!f?.featureFlags) return false;
        return !!(f.featureFlags as Record<string, unknown>)[flagKey];
    };

    return (
        <EntitlementContext.Provider value={{
            loading, features, workspaceId,
            hasFeature, getLimit, getFlag,
            refresh: fetchEntitlements,
        }}>
            {children}
        </EntitlementContext.Provider>
    );
}

export function useEntitlement() {
    return useContext(EntitlementContext);
}
