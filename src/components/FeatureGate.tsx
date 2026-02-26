'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { useEntitlement } from '@/hooks/useEntitlement';
import { FEATURE_LABELS } from '@/lib/features/registry';

interface FeatureGateProps {
    feature: string;
    children: ReactNode;
    /** What to show when feature is disabled. Default: upgrade prompt */
    fallback?: ReactNode;
    /** If true, hide completely instead of showing fallback */
    hideWhenDisabled?: boolean;
}

/**
 * <FeatureGate feature="AUTOMATION">
 *   <AutomationPanel />
 * </FeatureGate>
 *
 * Wrap UI sections to show/hide based on entitlement.
 */
export function FeatureGate({ feature, children, fallback, hideWhenDisabled }: FeatureGateProps) {
    const { hasFeature, loading } = useEntitlement();

    // Show children while loading (avoid flash of upgrade prompt)
    if (loading) return null;

    if (hasFeature(feature)) {
        return <>{children}</>;
    }

    if (hideWhenDisabled) return null;

    if (fallback) return <>{fallback}</>;

    // Default upgrade prompt
    const label = FEATURE_LABELS[feature] || feature;
    return (
        <div style={{
            padding: '2rem',
            textAlign: 'center',
            background: 'var(--color-surface, #f9fafb)',
            borderRadius: '12px',
            border: '1px dashed var(--color-border, #e5e7eb)',
            margin: '1rem 0',
        }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>
                {label}
            </h3>
            <p style={{ color: 'var(--color-text-muted, #6b7280)', margin: '0 0 1rem', fontSize: '0.9rem' }}>
                Tính năng này chưa được kích hoạt. Nâng cấp gói để sử dụng.
            </p>
            <Link
                href="/hub/marketplace"
                style={{
                    display: 'inline-block',
                    padding: '0.5rem 1.5rem',
                    background: 'var(--color-primary, #6366f1)',
                    color: 'white',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                }}
            >
                🛒 Xem Marketplace
            </Link>
        </div>
    );
}

/**
 * Inline version: conditionally renders children.
 * Does NOT show fallback — just hides.
 */
export function IfFeature({ feature, children }: { feature: string; children: ReactNode }) {
    return <FeatureGate feature={feature} hideWhenDisabled>{children}</FeatureGate>;
}
