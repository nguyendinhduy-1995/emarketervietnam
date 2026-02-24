'use client';

import { useEffect, useState } from 'react';

interface AnalyticsData {
    today: {
        views: number;
        uniqueVisitors: number;
        activeSessions: number;
        topPages: { path: string; views: number }[];
        topActions: { action: string; count: number }[];
        hourlyViews: number[];
    };
    last7Days: { date: string; day: string; views: number; unique: number }[];
    behavior: {
        totalSessions: number;
        categoryInterest: Record<string, number>;
        avgPrice: number;
    };
    aiInsights: string[];
}

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(n) + '₫';
}

const PAGE_LABELS: Record<string, string> = {
    '/': 'Trang chủ',
    '/search': 'Tìm kiếm',
    '/try-on': 'Thử kính',
    '/support': 'Tư vấn',
    '/faq': 'FAQ',
    '/cart': 'Giỏ hàng',
    '/checkout': 'Thanh toán',
    '/account': 'Tài khoản',
    '/wishlist': 'Yêu thích',
};

const ACTION_LABELS: Record<string, string> = {
    'click': 'Xem sản phẩm',
    'buy': 'Mua ngay',
    'add_cart': 'Thêm giỏ',
    'search': 'Tìm kiếm',
    'filter': 'Lọc',
};

export default function AnalyticsDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/smk/analytics/track')
            .then(r => r.json())
            .then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>⏳ Đang tải phân tích...</div>;
    if (!data) return null;

    const maxViews = Math.max(...data.last7Days.map(d => d.views), 1);
    const maxHourly = Math.max(...(data.today.hourlyViews || []), 1);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Real-time stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 'var(--space-3)' }}>
                {[
                    { icon: '👁️', label: 'LƯỢT XEM HÔM NAY', value: String(data.today.views), sub: `${data.today.uniqueVisitors} khách` },
                    { icon: '🟢', label: 'ĐANG ONLINE', value: String(data.today.activeSessions), sub: '30 phút qua' },
                    { icon: '📊', label: 'PHIÊN TRUY CẬP', value: String(data.behavior.totalSessions), sub: '7 ngày qua' },
                    { icon: '💰', label: 'NGÂN SÁCH TB', value: data.behavior.avgPrice > 0 ? formatVND(data.behavior.avgPrice) : 'N/A', sub: 'Quan tâm giá' },
                ].map(stat => (
                    <div key={stat.label} className="admin-stat-card">
                        <div className="admin-stat-card__header">
                            <span className="admin-stat-card__icon">{stat.icon}</span>
                            <span className="admin-stat-card__label">{stat.label}</span>
                        </div>
                        <div className="admin-stat-card__value">{stat.value}</div>
                        <div className="admin-stat-card__change admin-stat-card__change--up">
                            {stat.sub}
                        </div>
                    </div>
                ))}
            </div>

            {/* 7-day chart */}
            <div className="card" style={{ padding: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', margin: '0 0 var(--space-3)' }}>
                    📈 Lượt truy cập 7 ngày
                </h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                    {data.last7Days.map((day, i) => (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{day.views}</span>
                            <div style={{
                                width: '100%', borderRadius: 4,
                                height: Math.max(4, (day.views / maxViews) * 60),
                                background: i === data.last7Days.length - 1 ? '#a855f7' : 'rgba(168,85,247,0.35)',
                                transition: 'height 0.3s ease',
                            }} />
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{day.day}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Hourly distribution */}
            {data.today.hourlyViews && data.today.hourlyViews.some(v => v > 0) && (
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', margin: '0 0 var(--space-3)' }}>
                        ⏰ Phân bố theo giờ hôm nay
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 50 }}>
                        {data.today.hourlyViews.map((v, h) => (
                            <div key={h} style={{
                                flex: 1, borderRadius: 2,
                                height: Math.max(2, (v / maxHourly) * 40),
                                background: v > 0 ? (h >= 9 && h <= 21 ? '#22c55e' : 'rgba(34,197,94,0.3)') : 'var(--bg-tertiary)',
                                transition: 'height 0.3s ease',
                            }} title={`${h}:00 — ${v} lượt`} />
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>0h</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>6h</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>12h</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>18h</span>
                        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>23h</span>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
                {/* Top pages */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', margin: '0 0 var(--space-3)' }}>
                        📄 Trang được xem nhiều nhất
                    </h3>
                    {data.today.topPages.length > 0 ? data.today.topPages.map((p, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                            <span style={{ color: 'var(--text-primary)' }}>{PAGE_LABELS[p.path] || p.path}</span>
                            <span style={{ color: 'var(--gold-400)', fontWeight: 600, fontSize: 12 }}>{p.views} lượt</span>
                        </div>
                    )) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có dữ liệu</p>
                    )}
                </div>

                {/* Top actions */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', margin: '0 0 var(--space-3)' }}>
                        🎯 Hành động trên trang
                    </h3>
                    {data.today.topActions.length > 0 ? data.today.topActions.map((a, i) => {
                        const [type, target] = a.action.split(':');
                        return (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                                <div>
                                    <span style={{ fontSize: 10, fontWeight: 600, color: '#a855f7', background: 'rgba(168,85,247,0.1)', padding: '1px 6px', borderRadius: 4, marginRight: 6 }}>
                                        {ACTION_LABELS[type] || type}
                                    </span>
                                    <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{target}</span>
                                </div>
                                <span style={{ color: 'var(--gold-400)', fontWeight: 600, fontSize: 12 }}>{a.count}×</span>
                            </div>
                        );
                    }) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có dữ liệu</p>
                    )}
                </div>

                {/* Category interest */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-3)', margin: '0 0 var(--space-3)' }}>
                        📂 Danh mục quan tâm
                    </h3>
                    {Object.entries(data.behavior.categoryInterest).length > 0 ? (
                        Object.entries(data.behavior.categoryInterest)
                            .sort(([, a], [, b]) => b - a)
                            .map(([cat, count]) => (
                                <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, padding: '6px 0', borderBottom: '1px solid var(--border-secondary)' }}>
                                    <span style={{ color: 'var(--text-primary)' }}>{cat}</span>
                                    <span style={{ color: 'var(--gold-400)', fontWeight: 600, fontSize: 12 }}>{count} phiên</span>
                                </div>
                            ))
                    ) : (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>Chưa có dữ liệu</p>
                    )}
                </div>
            </div>

            {/* AI Insights */}
            {data.aiInsights.length > 0 && (
                <div className="card" style={{ padding: 'var(--space-4)', border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.03)' }}>
                    <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: '0 0 var(--space-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14 }}>🤖</span> AI phân tích hành vi
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {data.aiInsights.map((insight, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', fontSize: 13, color: 'var(--text-secondary)' }}>
                                <span style={{ color: '#a855f7', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                                {insight}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
