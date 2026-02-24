'use client';

import { useState } from 'react';

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface Partner { code: string; name: string; level: string; status: string; orders: number; revenue: number; commission: number; risk: number; }

const LEVEL_INFO: Record<string, { icon: string; color: string; bg: string }> = {
    LEADER: { icon: '👑', color: 'var(--gold-400)', bg: 'rgba(212,168,83,0.15)' },
    AGENT: { icon: '🏆', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    AFFILIATE: { icon: '⭐', color: 'var(--text-muted)', bg: 'var(--bg-tertiary)' },
};

const INIT: Partner[] = [
    { code: 'DUY123', name: 'Đại lý Duy', level: 'AGENT', status: 'ACTIVE', orders: 42, revenue: 85000000, commission: 8500000, risk: 12 },
    { code: 'AFF_MINH', name: 'Minh Affiliate', level: 'AFFILIATE', status: 'ACTIVE', orders: 15, revenue: 28000000, commission: 2800000, risk: 58 },
    { code: 'LEADER01', name: 'Shop Hà Nội', level: 'LEADER', status: 'ACTIVE', orders: 120, revenue: 320000000, commission: 32000000, risk: 5 },
    { code: 'NEW_AFF', name: 'Lan Ngọc', level: 'AFFILIATE', status: 'PENDING', orders: 0, revenue: 0, commission: 0, risk: 0 },
    { code: 'AFF_HOA', name: 'Hoà KOL', level: 'AFFILIATE', status: 'PENDING', orders: 0, revenue: 0, commission: 0, risk: 0 },
    { code: 'SUSPENDED01', name: 'Fake Partner', level: 'AFFILIATE', status: 'SUSPENDED', orders: 8, revenue: 5000000, commission: 500000, risk: 85 },
];

export default function AdminPartnersPage() {
    const [partners, setPartners] = useState<Partner[]>(INIT);
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
    const filtered = statusFilter === 'all' ? partners : partners.filter(p => p.status === statusFilter);

    const approvePartner = (code: string) => { setPartners(prev => prev.map(p => p.code === code ? { ...p, status: 'ACTIVE' } : p)); showToast('✅ Đã duyệt đối tác'); };
    const rejectPartner = (code: string) => { if (!confirm('Từ chối đối tác này?')) return; setPartners(prev => prev.filter(p => p.code !== code)); showToast('❌ Đã từ chối đối tác'); };
    const suspendPartner = (code: string) => { if (!confirm('Tạm dừng đối tác này?')) return; setPartners(prev => prev.map(p => p.code === code ? { ...p, status: 'SUSPENDED' } : p)); showToast('🚫 Đã tạm dừng đối tác'); };
    const reactivatePartner = (code: string) => { setPartners(prev => prev.map(p => p.code === code ? { ...p, status: 'ACTIVE' } : p)); showToast('✅ Đã kích hoạt lại đối tác'); };
    const upgradePartner = (code: string) => { const NEXT: Record<string, string> = { AFFILIATE: 'AGENT', AGENT: 'LEADER' }; setPartners(prev => prev.map(p => p.code === code ? { ...p, level: NEXT[p.level] || p.level } : p)); showToast('⬆️ Đã nâng cấp đối tác'); };

    return (
        <div className="animate-in">
            {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', background: 'rgba(34,197,94,0.9)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{toast}</div>}

            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>🤝 Đối tác</h1>

            {/* Stats */}
            <div className="zen-stat-grid">
                {[
                    { l: 'Tổng', v: partners.length, icon: '🤝', c: 'var(--text-primary)' },
                    { l: 'Hoạt động', v: partners.filter(p => p.status === 'ACTIVE').length, icon: '✅', c: 'var(--success)' },
                    { l: 'Chờ duyệt', v: partners.filter(p => p.status === 'PENDING').length, icon: '⏳', c: 'var(--warning)' },
                    { l: 'Tạm dừng', v: partners.filter(p => p.status === 'SUSPENDED').length, icon: '🚫', c: 'var(--error)' },
                    { l: 'Tổng doanh thu', v: formatVND(partners.reduce((s, p) => s + p.revenue, 0)), icon: '💰', c: 'var(--gold-400)' },
                ].map(s => (
                    <div key={s.l} className="admin-stat-card">
                        <div className="admin-stat-card__header">
                            <span className="admin-stat-card__icon">{s.icon}</span>
                            <span className="admin-stat-card__label">{s.l}</span>
                        </div>
                        <div className="admin-stat-card__value" style={{ color: s.c }}>{s.v}</div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="admin-filter-scroll" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                {[{ v: 'all', l: 'Tất cả' }, { v: 'PENDING', l: '⏳ Chờ duyệt' }, { v: 'ACTIVE', l: '✅ Hoạt động' }, { v: 'SUSPENDED', l: '🚫 Tạm dừng' }].map(f => (
                    <button key={f.v} className="btn btn-sm" onClick={() => setStatusFilter(f.v)}
                        style={{ background: statusFilter === f.v ? 'rgba(212,168,83,0.15)' : 'var(--bg-tertiary)', color: statusFilter === f.v ? 'var(--gold-400)' : 'var(--text-muted)', border: statusFilter === f.v ? '1px solid var(--gold-400)' : '1px solid var(--border-primary)' }}>{f.l}</button>
                ))}
            </div>

            {/* Mobile Card View */}
            <div className="zen-mobile-cards">
                {filtered.map(p => {
                    const lvl = LEVEL_INFO[p.level] || LEVEL_INFO.AFFILIATE;
                    return (
                        <div key={p.code} className="zen-mobile-card">
                            <div className="zen-mobile-card__header">
                                <div>
                                    <div className="zen-mobile-card__title">{p.name}</div>
                                    <div className="zen-mobile-card__subtitle" style={{ fontFamily: 'monospace' }}>{p.code}</div>
                                </div>
                                <span className="zen-mobile-card__badge" style={{ background: lvl.bg, color: lvl.color }}>
                                    {lvl.icon} {p.level}
                                </span>
                            </div>
                            <div className="zen-mobile-card__fields">
                                <div>
                                    <div className="zen-mobile-card__field-label">Đơn hàng</div>
                                    <div className="zen-mobile-card__field-value">{p.orders}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Doanh thu</div>
                                    <div className="zen-mobile-card__field-value" style={{ fontWeight: 600 }}>{formatVND(p.revenue)}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Hoa hồng</div>
                                    <div className="zen-mobile-card__field-value" style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{formatVND(p.commission)}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Risk</div>
                                    <div className="zen-mobile-card__field-value" style={{ color: p.risk > 40 ? 'var(--error)' : p.risk > 20 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{p.risk}</div>
                                </div>
                            </div>
                            <div className="zen-mobile-card__actions">
                                {p.status === 'PENDING' && (
                                    <>
                                        <button className="btn btn-sm btn-primary" onClick={() => approvePartner(p.code)}>✅ Duyệt</button>
                                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => rejectPartner(p.code)}>✕ Từ chối</button>
                                    </>
                                )}
                                {p.status === 'ACTIVE' && (
                                    <>
                                        {p.level !== 'LEADER' && <button className="btn btn-sm btn-ghost" onClick={() => upgradePartner(p.code)}>⬆️ Nâng cấp</button>}
                                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => suspendPartner(p.code)}>🚫 Dừng</button>
                                    </>
                                )}
                                {p.status === 'SUSPENDED' && <button className="btn btn-sm btn-ghost" onClick={() => reactivatePartner(p.code)}>🔄 Kích hoạt</button>}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="zen-table-desktop card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Mã</th><th>Đối tác</th><th>Cấp độ</th><th>Đơn hàng</th><th>Doanh thu</th><th>Hoa hồng</th><th>Risk</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {filtered.map(p => {
                            const lvl = LEVEL_INFO[p.level] || LEVEL_INFO.AFFILIATE;
                            return (
                                <tr key={p.code}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-primary)' }}>{p.code}</td>
                                    <td>{p.name}</td>
                                    <td><span className="badge" style={{ background: lvl.bg, color: lvl.color }}>{lvl.icon} {p.level}</span></td>
                                    <td>{p.orders}</td>
                                    <td style={{ fontWeight: 600 }}>{formatVND(p.revenue)}</td>
                                    <td style={{ color: 'var(--gold-400)' }}>{formatVND(p.commission)}</td>
                                    <td><span style={{ color: p.risk > 40 ? 'var(--error)' : p.risk > 20 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{p.risk}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                            {p.status === 'PENDING' && (<><button className="btn btn-sm btn-primary" onClick={() => approvePartner(p.code)}>✅ Duyệt</button><button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => rejectPartner(p.code)}>✕</button></>)}
                                            {p.status === 'ACTIVE' && (<>{p.level !== 'LEADER' && <button className="btn btn-sm btn-ghost" onClick={() => upgradePartner(p.code)}>⬆️ Nâng</button>}<button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => suspendPartner(p.code)}>🚫</button></>)}
                                            {p.status === 'SUSPENDED' && <button className="btn btn-sm btn-ghost" onClick={() => reactivatePartner(p.code)}>🔄 Kích hoạt</button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* D10 — Leaderboard */}
            <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    🏆 Bảng xếp hạng tháng
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(212,168,83,0.12)', color: 'var(--gold-400)' }}>Top Sellers</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[...partners].filter(p => p.status === 'ACTIVE').sort((a, b) => b.revenue - a.revenue).slice(0, 5).map((p, i) => {
                        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                        const lvl = LEVEL_INFO[p.level] || LEVEL_INFO.AFFILIATE;
                        return (
                            <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: i === 0 ? 'rgba(212,168,83,0.06)' : 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: i === 0 ? '1px solid rgba(212,168,83,0.2)' : '1px solid var(--border-primary)' }}>
                                <span style={{ fontSize: 20, flexShrink: 0 }}>{medals[i]}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{lvl.icon} {p.level} · {p.orders} đơn</div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gold-400)' }}>{formatVND(p.revenue)}</div>
                                    <div style={{ fontSize: 10, color: 'var(--success)' }}>HH: {formatVND(p.commission)}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {partners.filter(p => p.status === 'ACTIVE').length === 0 && (
                    <div style={{ textAlign: 'center', padding: 'var(--space-4)', color: 'var(--text-muted)', fontSize: 13 }}>Chưa có đối tác hoạt động</div>
                )}
            </div>
        </div>
    );
}
