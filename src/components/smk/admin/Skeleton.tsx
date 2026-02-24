'use client';

import React from 'react';

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    variant?: 'text' | 'rect' | 'circle';
    count?: number;
    gap?: number;
}

function SkeletonItem({ width, height, borderRadius, variant = 'rect' }: Omit<SkeletonProps, 'count' | 'gap'>) {
    const styles: React.CSSProperties = {
        width: variant === 'circle' ? (height || 40) : (width || '100%'),
        height: variant === 'text' ? 14 : (height || 20),
        borderRadius: variant === 'circle' ? '50%' : (borderRadius || 'var(--radius-md)'),
        background: 'linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%)',
        backgroundSize: '200% 100%',
        animation: 'admin-shimmer 1.5s infinite ease-in-out',
    };

    return <div style={styles} />;
}

export default function Skeleton({ count = 1, gap = 8, ...rest }: SkeletonProps) {
    if (count <= 1) return <SkeletonItem {...rest} />;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap }}>
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonItem key={i} {...rest} />
            ))}
        </div>
    );
}

/* Prebuilt skeleton patterns */
export function SkeletonStatCards({ count = 4 }: { count?: number }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="admin-stat-card" style={{ padding: 'var(--space-4)' }}>
                    <Skeleton width="60%" height={10} />
                    <div style={{ height: 8 }} />
                    <Skeleton width="40%" height={20} />
                </div>
            ))}
        </div>
    );
}

export function SkeletonTableRows({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 'var(--space-4)' }}>
            {Array.from({ length: rows }).map((_, r) => (
                <div key={r} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    {Array.from({ length: cols }).map((_, c) => (
                        <Skeleton key={c} width={c === 0 ? '30%' : '20%'} height={14} />
                    ))}
                </div>
            ))}
        </div>
    );
}
