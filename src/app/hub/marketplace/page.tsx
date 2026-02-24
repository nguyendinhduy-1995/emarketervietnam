'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ProductInfo {
    id: string; key: string; slug: string; name: string;
    tagline: string | null; outcomeText: string | null;
    industry: string[]; icon: string | null;
    priceMonthly: number;
}

const INDUSTRY_LABELS: Record<string, string> = {
    SPA: 'Spa & Salon', SALES: 'Bán hàng', PERSONAL: 'Cá nhân',
};

const INDUSTRY_FILTERS = [
    { key: 'ALL', label: 'Tất cả' },
    { key: 'SPA', label: 'Spa & Salon' },
    { key: 'SALES', label: 'Bán hàng' },
    { key: 'PERSONAL', label: 'Cá nhân' },
];

export default function MarketplacePage() {
    const [products, setProducts] = useState<ProductInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetch('/api/hub/products').then(r => r.json()).then(d => {
            setProducts(d.products || []);
            setLoading(false);
        });
    }, []);

    const filtered = products.filter(p => {
        if (filter !== 'ALL' && !p.industry.includes(filter)) return false;
        if (search && !p.name.toLowerCase().includes(search.toLowerCase())
            && !(p.tagline || '').toLowerCase().includes(search.toLowerCase())) return false;
        return true;
    });

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="emk-skeleton" style={{ height: '44px' }} />
            {[1, 2, 3].map(i => <div key={i} className="emk-skeleton" style={{ height: '160px' }} />)}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>🛒 Giải pháp</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Chọn giải pháp phù hợp với mục tiêu của bạn</p>
            </div>

            {/* Search */}
            <input
                type="text" placeholder="Tìm giải pháp..." value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                    width: '100%', padding: '12px 16px', borderRadius: '14px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit', outline: 'none',
                }}
            />

            {/* Filter chips */}
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {INDUSTRY_FILTERS.map(f => (
                    <button key={f.key} onClick={() => setFilter(f.key)} style={{
                        padding: '8px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
                        background: filter === f.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: filter === f.key ? 'white' : 'var(--text-secondary)',
                        border: filter === f.key ? 'none' : '1px solid var(--border)',
                        fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 150ms ease',
                    }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Product Grid */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
                    <p style={{ fontWeight: 600 }}>Không tìm thấy giải pháp</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Thử thay đổi bộ lọc</p>
                </div>
            ) : (
                <div className="emk-stagger" style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
                    {filtered.map(p => (
                        <Link key={p.id} href={`/hub/marketplace/${p.slug}`} className="emk-card-hover" style={{
                            padding: '18px', borderRadius: '18px', textDecoration: 'none',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '10px',
                            color: 'var(--text-primary)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '28px' }}>{p.icon || '📦'}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{p.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {p.priceMonthly > 0 ? `${p.priceMonthly.toLocaleString('vi-VN')}₫/tháng` : 'Miễn phí'}
                                    </div>
                                </div>
                            </div>
                            {p.tagline && (
                                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-primary)', margin: 0 }}>{p.tagline}</p>
                            )}
                            {p.outcomeText && (
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{p.outcomeText}</p>
                            )}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {p.industry.map(ind => (
                                    <span key={ind} style={{
                                        padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                                        background: 'rgba(99,102,241,0.1)', color: 'var(--accent-primary)',
                                    }}>
                                        {INDUSTRY_LABELS[ind] || ind}
                                    </span>
                                ))}
                            </div>
                            <div style={{
                                padding: '10px', borderRadius: '12px', textAlign: 'center',
                                background: 'var(--accent-gradient)', color: 'white',
                                fontWeight: 700, fontSize: '14px',
                                boxShadow: 'var(--shadow-glow)',
                            }}>
                                Xem chi tiết →
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
