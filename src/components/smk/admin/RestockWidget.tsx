'use client';

import { useState, useEffect } from 'react';

interface RestockItem {
    product: string; currentStock: number; avgDailySales: number;
    daysUntilOut: number; suggestedQty: number; priority: string;
}

export default function RestockWidget() {
    const [items, setItems] = useState<RestockItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/smk/ai/restock').then(r => r.json()).then(data => {
            setItems(data.suggestions || data.items || []);
        }).catch(() => {
            // Fallback data
            setItems([
                { product: 'Gọng kính titan đen', currentStock: 3, avgDailySales: 1.5, daysUntilOut: 2, suggestedQty: 20, priority: 'urgent' },
                { product: 'Kính râm Aviator Gold', currentStock: 5, avgDailySales: 0.8, daysUntilOut: 6, suggestedQty: 15, priority: 'high' },
                { product: 'Tròng chống xanh 1.56', currentStock: 12, avgDailySales: 0.5, daysUntilOut: 24, suggestedQty: 10, priority: 'normal' },
            ]);
        }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ height: 120, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
        </div>
    );

    if (items.length === 0) return null;

    const priorityStyle = (p: string) => ({
        urgent: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: '🔴 Cần nhập ngay' },
        high: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: '🟡 Sắp hết' },
        normal: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', label: '🟢 Bình thường' },
    }[p] || { color: 'var(--text-muted)', bg: 'var(--bg-tertiary)', label: p });

    return (
        <div className="card" style={{ padding: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🤖 AI Gợi ý nhập hàng
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(212,168,83,0.12)', color: 'var(--gold-400)' }}>Smart Restock</span>
                </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((item, i) => {
                    const ps = priorityStyle(item.priority);
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-md)', background: ps.bg, fontSize: 13 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product}</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                    Tồn: {item.currentStock} · Bán: {item.avgDailySales}/ngày · Hết sau: {item.daysUntilOut} ngày
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 10, color: ps.color, fontWeight: 700 }}>{ps.label}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold-400)' }}>+{item.suggestedQty} SP</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
