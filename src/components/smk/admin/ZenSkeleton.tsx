'use client';

/**
 * ZenSkeleton — shimmer loading placeholder
 * Usage: <ZenSkeleton rows={3} /> or <ZenSkeleton type="stat-grid" />
 */

interface ZenSkeletonProps {
    rows?: number;
    type?: 'cards' | 'stat-grid' | 'table';
}

function ShimmerLine({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
    return (
        <div className="zen-skeleton__line" style={{ width, height, borderRadius: 6 }} />
    );
}

function SkeletonCard() {
    return (
        <div className="zen-skeleton__card zen-mobile-card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                <div style={{ flex: 1 }}>
                    <ShimmerLine width="60%" height={16} />
                    <div style={{ marginTop: 6 }}><ShimmerLine width="40%" height={12} /></div>
                </div>
                <ShimmerLine width={60} height={24} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2) var(--space-4)' }}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i}>
                        <ShimmerLine width="50%" height={10} />
                        <div style={{ marginTop: 4 }}><ShimmerLine width="70%" height={14} /></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function SkeletonStatGrid() {
    return (
        <div className="zen-stat-grid">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="admin-stat-card zen-skeleton__stat" style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <ShimmerLine width={20} height={20} />
                    <div style={{ marginTop: 8 }}><ShimmerLine width="60%" height={10} /></div>
                    <div style={{ marginTop: 6 }}><ShimmerLine width="80%" height={22} /></div>
                </div>
            ))}
        </div>
    );
}

export default function ZenSkeleton({ rows = 3, type = 'cards' }: ZenSkeletonProps) {
    if (type === 'stat-grid') return <SkeletonStatGrid />;

    return (
        <div className="zen-skeleton" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}
