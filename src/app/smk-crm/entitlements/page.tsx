'use client';

import { useEffect, useState } from 'react';

interface FeatureInfo {
    key: string;
    label: string;
    icon: string;
    desc: string;
    longDesc: string;
    impact: string;
    category: string;
    price: string;
    highlights: string[];
    enabled: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
    'Vận hành': '#3b82f6',
    'Tăng trưởng': '#22c55e',
    'Dịch vụ': '#a855f7',
    'Bán hàng': '#f59e0b',
    'Marketing': '#ec4899',
    'Phân tích': '#06b6d4',
    'Trải nghiệm': '#f97316',
    'Giữ chân': '#14b8a6',
    'Chuyên ngành': '#8b5cf6',
};

// Map feature key → Hub marketplace product slug
const KEY_TO_SLUG: Record<string, string> = {
    ADV_SHIPPING: 'smk-addon-shipping',
    ADV_WAREHOUSE: 'smk-addon-warehouse',
    ADV_PARTNER: 'smk-addon-partner',
    ADV_RETURNS: 'smk-addon-returns',
    ADV_REVIEWS: 'smk-addon-reviews',
    ADV_AI: 'smk-addon-ai',
    ADV_ANALYTICS: 'smk-addon-analytics',
    ADV_AUTOMATION: 'smk-addon-automation',
    ADV_TRYON: 'smk-addon-tryon',
    ADV_LOYALTY: 'smk-addon-loyalty',
    ADV_PRESCRIPTION: 'smk-addon-prescription',
    ADV_SEO: 'smk-addon-seo',
    ADV_SUPPORT: 'smk-addon-support',
    ADV_SHOP_EXTRAS: 'smk-addon-shop-extras',
};

const HUB_URL = process.env.NEXT_PUBLIC_HUB_URL || 'http://localhost:3000';

export default function EntitlementsPage() {
    const [features, setFeatures] = useState<FeatureInfo[]>([]);
    const [limits, setLimits] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [expandedKey, setExpandedKey] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/smk/admin/features')
            .then(r => r.json())
            .then(d => {
                setFeatures(d.all || []);
                setLimits(d.limits || {});
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const enabledCount = features.filter(f => f.enabled).length;
    const categories = [...new Set(features.map(f => f.category))];

    if (loading) return (
        <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            Đang tải tính năng...
        </div>
    );

    return (
        <div style={{ maxWidth: '900px' }}>
            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🔑 Tính năng & Quyền sử dụng</h1>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {enabledCount}/{features.length} tính năng nâng cao đang kích hoạt
                        </p>
                    </div>
                    <div style={{
                        padding: '8px 16px', borderRadius: '12px',
                        background: enabledCount === features.length
                            ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)',
                        color: enabledCount === features.length ? '#22c55e' : '#eab308',
                        fontSize: '13px', fontWeight: 700,
                    }}>
                        {enabledCount === features.length ? '✅ Full Package' : `${enabledCount} / ${features.length} ON`}
                    </div>
                </div>

                {/* Category Pills */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '16px' }}>
                    {categories.map(cat => {
                        const count = features.filter(f => f.category === cat).length;
                        const enabled = features.filter(f => f.category === cat && f.enabled).length;
                        return (
                            <span key={cat} style={{
                                fontSize: '11px', padding: '3px 10px', borderRadius: '20px',
                                background: `${CATEGORY_COLORS[cat] || '#6b7280'}15`,
                                color: CATEGORY_COLORS[cat] || '#6b7280',
                                fontWeight: 600,
                            }}>
                                {cat} ({enabled}/{count})
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Feature Cards */}
            <div style={{ display: 'grid', gap: '12px' }}>
                {features.map(f => {
                    const isExpanded = expandedKey === f.key;
                    const catColor = CATEGORY_COLORS[f.category] || '#6b7280';

                    return (
                        <div key={f.key} style={{
                            borderRadius: '14px',
                            background: 'var(--bg-card, #fff)',
                            border: `1px solid ${f.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)'}`,
                            overflow: 'hidden',
                            transition: 'all 200ms',
                            boxShadow: isExpanded ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
                        }}>
                            {/* Card Header */}
                            <div
                                onClick={() => setExpandedKey(isExpanded ? null : f.key)}
                                style={{
                                    padding: '16px 20px',
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', gap: '14px',
                                    opacity: f.enabled ? 1 : 0.7,
                                }}
                            >
                                <span style={{ fontSize: '26px', flexShrink: 0 }}>{f.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                        <span style={{ fontWeight: 700, fontSize: '14px' }}>{f.label}</span>
                                        <span style={{
                                            fontSize: '9px', padding: '2px 8px', borderRadius: '10px',
                                            background: `${catColor}15`, color: catColor,
                                            fontWeight: 700, textTransform: 'uppercase',
                                        }}>{f.category}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{f.desc}</p>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                    <span style={{
                                        fontSize: '11px', fontWeight: 700,
                                        color: 'var(--text-muted)',
                                    }}>{f.price}</span>
                                    <div style={{
                                        width: '38px', height: '22px', borderRadius: '11px', position: 'relative',
                                        background: f.enabled ? '#22c55e' : 'rgba(0,0,0,0.15)',
                                        transition: 'all 200ms',
                                    }}>
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '50%', background: '#fff',
                                            position: 'absolute', top: '2px',
                                            left: f.enabled ? '18px' : '2px',
                                            transition: 'all 200ms',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                        }} />
                                    </div>
                                    <span style={{
                                        fontSize: '16px', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 200ms', color: 'var(--text-muted)',
                                    }}>▾</span>
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div style={{
                                    padding: '0 20px 20px', borderTop: '1px solid var(--border, #e5e7eb)',
                                    animation: 'fadeIn 200ms ease',
                                }}>
                                    {/* Description */}
                                    <div style={{ marginTop: '16px' }}>
                                        <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary, #4b5563)' }}>
                                            {f.longDesc}
                                        </p>
                                    </div>

                                    {/* Highlights */}
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '12px',
                                    }}>
                                        {f.highlights.map((h, i) => (
                                            <span key={i} style={{
                                                fontSize: '11px', padding: '4px 10px', borderRadius: '8px',
                                                background: 'rgba(0,0,0,0.04)', color: 'var(--text-secondary, #4b5563)',
                                                fontWeight: 500,
                                            }}>✓ {h}</span>
                                        ))}
                                    </div>

                                    {/* Impact Box */}
                                    <div style={{
                                        marginTop: '14px', padding: '12px 16px', borderRadius: '10px',
                                        background: 'rgba(34,197,94,0.06)',
                                        border: '1px solid rgba(34,197,94,0.12)',
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            📊 Hiệu quả thực tế
                                        </div>
                                        <p style={{ fontSize: '12px', lineHeight: '1.6', color: 'var(--text-secondary, #4b5563)', margin: 0 }}>
                                            {f.impact}
                                        </p>
                                    </div>

                                    {/* Feature Key + Status */}
                                    <div style={{
                                        marginTop: '12px', display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                                    }}>
                                        <code style={{
                                            fontSize: '10px', padding: '3px 8px', borderRadius: '6px',
                                            background: 'rgba(0,0,0,0.04)', color: 'var(--text-muted)',
                                        }}>{f.key}</code>
                                        {!f.enabled && (
                                            <a
                                                href={`${HUB_URL}/hub/marketplace/${KEY_TO_SLUG[f.key] || 'smk-crm-matkinh'}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    fontSize: '12px', padding: '6px 16px', borderRadius: '8px',
                                                    background: 'var(--gradient-gold, linear-gradient(135deg, #d4a853, #b8860b))',
                                                    color: '#fff', fontWeight: 700, textDecoration: 'none',
                                                    boxShadow: '0 2px 8px rgba(212,168,83,0.3)',
                                                }}
                                            >
                                                🛒 Mua trên Hub
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Limits */}
            {Object.keys(limits).length > 0 && (
                <div style={{ marginTop: '28px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>📊 Giới hạn sử dụng</h2>
                    <div style={{
                        padding: '16px', borderRadius: '12px',
                        background: 'var(--bg-card, #fff)', border: '1px solid var(--border, #e5e7eb)',
                    }}>
                        {Object.entries(limits).map(([key, val]) => (
                            <div key={key} style={{
                                display: 'flex', justifyContent: 'space-between',
                                padding: '8px 0', borderBottom: '1px solid var(--border, #e5e7eb)',
                            }}>
                                <code style={{ fontSize: '12px' }}>{key}</code>
                                <span style={{ fontWeight: 700 }}>{val.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Config Info */}
            <div style={{
                marginTop: '28px', padding: '16px 20px', borderRadius: '12px',
                background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.1)',
                fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.8',
            }}>
                <strong>💡 Cách cấu hình:</strong><br />
                Feature flags được đọc từ biến môi trường <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: '4px' }}>SMK_FEATURES</code><br />
                <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: '4px' }}>ALL</code> = tất cả bật &nbsp;|&nbsp;
                <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: '4px' }}>NONE</code> = tất cả tắt &nbsp;|&nbsp;
                Hoặc danh sách key cách bằng dấu phẩy<br />
                Ví dụ: <code style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 6px', borderRadius: '4px' }}>SMK_FEATURES=ADV_SHIPPING,ADV_WAREHOUSE,ADV_AI</code>
            </div>
        </div>
    );
}
