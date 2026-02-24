'use client';

import { useState } from 'react';
import ExportButton from '@/components/smk/admin/ExportButton';

interface Customer {
    name: string; email: string; phone: string; orders: number; spent: number; joined: string; tier: string;
}

const TIERS: Record<string, { label: string; color: string; bg: string }> = {
    NEW: { label: 'Mới', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
    SILVER: { label: 'Silver', color: '#9ca3af', bg: 'rgba(156,163,175,0.15)' },
    GOLD: { label: 'Gold', color: 'var(--gold-400)', bg: 'rgba(212,168,83,0.15)' },
    VIP: { label: 'VIP', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)' },
};

const TIER_ICONS: Record<string, string> = { NEW: '🆕', SILVER: '🥈', GOLD: '🥇', VIP: '💎' };

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

const INIT_CUSTOMERS: Customer[] = [
    { name: 'Võ Thanh', email: 'thanh@example.com', phone: '0956 789 012', orders: 7, spent: 32560000, joined: '12/2025', tier: 'VIP' },
    { name: 'Nguyễn Văn Khách', email: 'khach@example.com', phone: '0912 345 678', orders: 5, spent: 18500000, joined: '01/2026', tier: 'GOLD' },
    { name: 'Trần Thị Mai', email: 'mai@example.com', phone: '0923 456 789', orders: 3, spent: 12780000, joined: '01/2026', tier: 'SILVER' },
    { name: 'Lê Hoàng', email: 'hoang@example.com', phone: '0934 567 890', orders: 2, spent: 6280000, joined: '02/2026', tier: 'NEW' },
    { name: 'Phạm Minh', email: 'minh@example.com', phone: '0945 678 901', orders: 1, spent: 8990000, joined: '02/2026', tier: 'NEW' },
    { name: 'Đỗ Lan', email: 'lan@example.com', phone: '0967 890 123', orders: 4, spent: 15230000, joined: '01/2026', tier: 'SILVER' },
];

export default function AdminCustomersPage() {
    const [search, setSearch] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [sortBy, setSortBy] = useState<'spent' | 'orders' | 'name'>('spent');
    const [aiInsight, setAiInsight] = useState<{ churnRisk: string; churnReason: string; upsellSuggestion: string; nextAction: string; lifetimeValue: string } | null>(null);
    const [aiLoading, setAiLoading] = useState(false);

    const filtered = INIT_CUSTOMERS
        .filter(c => tierFilter === 'all' || c.tier === tierFilter)
        .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
        .sort((a, b) => sortBy === 'spent' ? b.spent - a.spent : sortBy === 'orders' ? b.orders - a.orders : a.name.localeCompare(b.name));

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>👥 Khách hàng</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flex: '1 1 180px', minWidth: 0, maxWidth: 360 }}>
                    <input className="input" placeholder="🔍 Tìm tên, email, SĐT..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)' }} />
                    <ExportButton
                        data={filtered.map(c => ({ ...c } as unknown as Record<string, unknown>))}
                        columns={[
                            { key: 'name', label: 'Tên' },
                            { key: 'email', label: 'Email' },
                            { key: 'phone', label: 'SĐT' },
                            { key: 'tier', label: 'Hạng' },
                            { key: 'orders', label: 'Đơn hàng' },
                            { key: 'spent', label: 'Tổng chi', format: (v) => formatVND(v as number) },
                        ]}
                        filename="khach-hang"
                    />
                </div>
            </div>

            {/* Stats */}
            <div className="zen-stat-grid">
                {[
                    { label: 'Tổng khách', value: String(INIT_CUSTOMERS.length), icon: '👥', color: 'var(--text-primary)' },
                    { label: 'VIP', value: String(INIT_CUSTOMERS.filter(c => c.tier === 'VIP').length), icon: '💎', color: '#a78bfa' },
                    { label: 'Gold', value: String(INIT_CUSTOMERS.filter(c => c.tier === 'GOLD').length), icon: '🥇', color: 'var(--gold-400)' },
                    { label: 'Tổng doanh thu', value: formatVND(INIT_CUSTOMERS.reduce((s, c) => s + c.spent, 0)), icon: '💰', color: 'var(--gold-400)' },
                ].map(s => (
                    <div key={s.label} className="admin-stat-card">
                        <div className="admin-stat-card__header">
                            <span className="admin-stat-card__icon">{s.icon}</span>
                            <span className="admin-stat-card__label">{s.label}</span>
                        </div>
                        <div className="admin-stat-card__value" style={{ color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* Filters & Sort */}
            <div className="admin-filter-scroll" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
                {[{ v: 'all', l: 'Tất cả' }, ...Object.entries(TIERS).map(([v, d]) => ({ v, l: `${TIER_ICONS[v]} ${d.label}` }))].map(f => (
                    <button key={f.v} className="btn btn-sm" onClick={() => setTierFilter(f.v)}
                        style={{ background: tierFilter === f.v ? 'rgba(212,168,83,0.15)' : 'var(--bg-tertiary)', color: tierFilter === f.v ? 'var(--gold-400)' : 'var(--text-muted)', border: tierFilter === f.v ? '1px solid var(--gold-400)' : '1px solid var(--border-primary)' }}>{f.l}</button>
                ))}
                <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Sắp xếp:</span>
                {[{ v: 'spent' as const, l: '💰 Chi tiêu' }, { v: 'orders' as const, l: '📦 Đơn' }, { v: 'name' as const, l: '🔤 Tên' }].map(s => (
                    <button key={s.v} className="btn btn-sm" onClick={() => setSortBy(s.v)}
                        style={{ background: sortBy === s.v ? 'rgba(212,168,83,0.2)' : undefined, color: sortBy === s.v ? 'var(--gold-400)' : undefined, fontSize: 'var(--text-xs)' }}>{s.l}</button>
                ))}
            </div>

            {/* Detail panel */}
            {selectedCustomer && (
                <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)', border: '1px solid var(--gold-400)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>👤 {selectedCustomer.name}</h3>
                        <button className="btn btn-sm btn-ghost" onClick={() => setSelectedCustomer(null)}>✕</button>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
                        <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {selectedCustomer.email}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>SĐT:</span> {selectedCustomer.phone}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Cấp bậc:</span> <span style={{ color: TIERS[selectedCustomer.tier]?.color }}>{TIER_ICONS[selectedCustomer.tier]} {TIERS[selectedCustomer.tier]?.label}</span></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tham gia:</span> {selectedCustomer.joined}</div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tổng đơn:</span> <strong>{selectedCustomer.orders}</strong></div>
                        <div><span style={{ color: 'var(--text-muted)' }}>Tổng chi:</span> <strong style={{ color: 'var(--gold-400)' }}>{formatVND(selectedCustomer.spent)}</strong></div>
                    </div>

                    {/* A4: Inline Purchase History */}
                    <div style={{ marginTop: 'var(--space-4)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-primary)' }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>📦 LỊCH SỬ MUA HÀNG</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {Array.from({ length: Math.min(selectedCustomer.orders, 3) }, (_, i) => {
                                const statuses = ['DELIVERED', 'SHIPPING', 'CONFIRMED'];
                                const st = statuses[i] || 'DELIVERED';
                                const statusColors: Record<string, string> = { DELIVERED: '#22c55e', SHIPPING: '#60a5fa', CONFIRMED: '#fbbf24' };
                                const statusLabels: Record<string, string> = { DELIVERED: 'Đã giao', SHIPPING: 'Đang giao', CONFIRMED: 'Xác nhận' };
                                const amount = Math.round(selectedCustomer.spent / selectedCustomer.orders * (0.7 + Math.random() * 0.6));
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 6, background: 'var(--bg-tertiary)', fontSize: 12 }}>
                                        <span style={{ fontSize: 14 }}>📦</span>
                                        <span style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: 10 }}>SMK-{2026 * 100 + (2 - i)}0{15 + i}</span>
                                        <span style={{ color: 'var(--gold-400)', fontWeight: 700, flex: 1 }}>{formatVND(amount)}</span>
                                        <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 99, background: `${statusColors[st]}20`, color: statusColors[st], fontWeight: 700 }}>{statusLabels[st]}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Loyalty Points */}
                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-3)' }}>
                        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(212,168,83,0.06)', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Điểm Loyalty</div>
                            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--gold-400)' }}>{Math.round(selectedCustomer.spent / 10000)}</div>
                        </div>
                        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TB đơn</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e' }}>{formatVND(Math.round(selectedCustomer.spent / Math.max(1, selectedCustomer.orders)))}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-3)', display: 'flex', gap: 'var(--space-2)' }}>
                        <button className="btn btn-sm" disabled={aiLoading} onClick={async () => {
                            setAiLoading(true);
                            try {
                                const res = await fetch('/api/smk/ai/customer-insights', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerName: selectedCustomer.name, orders: selectedCustomer.orders, spent: selectedCustomer.spent, tier: selectedCustomer.tier }) });
                                setAiInsight(await res.json());
                            } catch { /* skip */ }
                            setAiLoading(false);
                        }} style={{ background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: 'none', fontWeight: 600 }}>
                            {aiLoading ? '⏳...' : '🧠 AI Insights'}
                        </button>
                    </div>
                    {aiInsight && (
                        <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(168,85,247,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168,85,247,0.2)', fontSize: 'var(--text-sm)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                                <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>Churn Risk:</span> <strong style={{ color: aiInsight.churnRisk === 'high' ? '#ef4444' : aiInsight.churnRisk === 'medium' ? '#f59e0b' : '#22c55e' }}>{aiInsight.churnRisk.toUpperCase()}</strong></div>
                                <div><span style={{ color: 'var(--text-muted)', fontSize: 11 }}>LTV:</span> <strong>{aiInsight.lifetimeValue}</strong></div>
                            </div>
                            <div style={{ marginTop: 'var(--space-2)', fontSize: 12, color: 'var(--text-secondary)' }}>💡 {aiInsight.upsellSuggestion}</div>
                            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--text-tertiary)' }}>🎯 {aiInsight.nextAction}</div>
                        </div>
                    )}
                </div>
            )}

            {/* B6: Customer Segmentation */}
            <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📊 Phân nhóm khách hàng</h3>
                {(() => {
                    const segments = [
                        { label: '💎 VIP (≥5 đơn)', count: INIT_CUSTOMERS.filter(c => c.orders >= 5).length, color: '#a78bfa' },
                        { label: '🟢 Active (2-4 đơn)', count: INIT_CUSTOMERS.filter(c => c.orders >= 2 && c.orders < 5).length, color: '#22c55e' },
                        { label: '🟡 At-risk (1 đơn)', count: INIT_CUSTOMERS.filter(c => c.orders === 1).length, color: '#fbbf24' },
                        { label: '🔴 Lost (0 đơn)', count: INIT_CUSTOMERS.filter(c => c.orders === 0).length, color: '#ef4444' },
                    ];
                    const total = Math.max(1, segments.reduce((s, g) => s + g.count, 0));
                    let acc = 0;
                    return (
                        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', flexWrap: 'wrap' }}>
                            <svg viewBox="0 0 36 36" style={{ width: 90, height: 90, flexShrink: 0 }}>
                                {segments.filter(s => s.count > 0).map((s) => {
                                    const pct = (s.count / total) * 100;
                                    const offset = 100 - acc;
                                    acc += pct;
                                    return <circle key={s.label} cx="18" cy="18" r="15.9" fill="none" stroke={s.color} strokeWidth="3.5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset={offset} />;
                                })}
                            </svg>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                                {segments.map(s => (
                                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
                                        <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{s.label}</span>
                                        <span style={{ fontWeight: 700 }}>{s.count}</span>
                                        <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 36, textAlign: 'right' }}>{Math.round((s.count / total) * 100)}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Mobile Card View */}
            <div className="zen-mobile-cards">
                {filtered.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Không tìm thấy khách hàng</div>
                ) : filtered.map(c => (
                    <div key={c.email} className="zen-mobile-card" onClick={() => setSelectedCustomer(c)} style={{ cursor: 'pointer' }}>
                        <div className="zen-mobile-card__header">
                            <div>
                                <div className="zen-mobile-card__title">{c.name}</div>
                                <div className="zen-mobile-card__subtitle">{c.email}</div>
                            </div>
                            <span className="zen-mobile-card__badge" style={{ background: TIERS[c.tier]?.bg, color: TIERS[c.tier]?.color }}>
                                {TIER_ICONS[c.tier]} {TIERS[c.tier]?.label}
                            </span>
                        </div>
                        <div className="zen-mobile-card__fields">
                            <div>
                                <div className="zen-mobile-card__field-label">Đơn hàng</div>
                                <div className="zen-mobile-card__field-value">{c.orders}</div>
                            </div>
                            <div>
                                <div className="zen-mobile-card__field-label">Tổng chi</div>
                                <div className="zen-mobile-card__field-value" style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{formatVND(c.spent)}</div>
                            </div>
                            <div>
                                <div className="zen-mobile-card__field-label">SĐT</div>
                                <div className="zen-mobile-card__field-value">{c.phone}</div>
                            </div>
                            <div>
                                <div className="zen-mobile-card__field-label">Tham gia</div>
                                <div className="zen-mobile-card__field-value">{c.joined}</div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table */}
            <div className="zen-table-desktop card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Khách hàng</th><th>Liên hệ</th><th>Cấp bậc</th><th>Đơn hàng</th><th>Tổng chi</th><th>Tham gia</th><th></th></tr></thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Không tìm thấy khách hàng</td></tr>
                        ) : filtered.map(c => (
                            <tr key={c.email}>
                                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                                <td>
                                    <div style={{ fontSize: 'var(--text-xs)' }}>{c.email}</div>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.phone}</div>
                                </td>
                                <td><span style={{ color: TIERS[c.tier]?.color, fontSize: 'var(--text-xs)', fontWeight: 600 }}>{TIER_ICONS[c.tier]} {TIERS[c.tier]?.label}</span></td>
                                <td>{c.orders}</td>
                                <td style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{formatVND(c.spent)}</td>
                                <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.joined}</td>
                                <td><button className="btn btn-sm btn-ghost" onClick={() => setSelectedCustomer(c)}>👁️ Chi tiết</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
