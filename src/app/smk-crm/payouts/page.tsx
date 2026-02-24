'use client';

import { useState } from 'react';

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface Payout { id: string; partner: string; name: string; amount: number; bank: string; status: string; date: string; note?: string; }

const INIT: Payout[] = [
    { id: 'p1', partner: 'DUY123', name: 'Đại lý Duy', amount: 1500000, bank: 'Vietcombank ****6789', status: 'REQUESTED', date: '20/02' },
    { id: 'p2', partner: 'AFF_MINH', name: 'Minh Affiliate', amount: 800000, bank: 'MB Bank ****4321', status: 'REQUESTED', date: '19/02' },
    { id: 'p3', partner: 'LEADER01', name: 'Shop Hà Nội', amount: 5000000, bank: 'TCB ****8765', status: 'APPROVED', date: '18/02' },
    { id: 'p4', partner: 'DUY123', name: 'Đại lý Duy', amount: 2200000, bank: 'Vietcombank ****6789', status: 'PAID', date: '15/02' },
    { id: 'p5', partner: 'LEADER01', name: 'Shop Hà Nội', amount: 3500000, bank: 'TCB ****8765', status: 'PAID', date: '10/02' },
];

const STATUS_MAP: Record<string, { label: string; icon: string; color: string; bg: string }> = {
    REQUESTED: { label: 'Chờ duyệt', icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    APPROVED: { label: 'Đã duyệt', icon: '✅', color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
    PAID: { label: 'Đã trả', icon: '💸', color: '#60a5fa', bg: 'rgba(96,165,250,0.15)' },
    REJECTED: { label: 'Từ chối', icon: '❌', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

export default function AdminPayoutsPage() {
    const [payouts, setPayouts] = useState<Payout[]>(INIT);
    const [filter, setFilter] = useState('all');
    const [toast, setToast] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };
    const approvePayout = (id: string) => { setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'APPROVED' } : p)); showToast('✅ Đã duyệt yêu cầu rút tiền'); };
    const rejectPayout = (id: string) => { const note = prompt('Lý do từ chối:'); if (!note) return; setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'REJECTED', note } : p)); showToast('❌ Đã từ chối yêu cầu'); };
    const markPaid = (id: string) => { if (!confirm('Xác nhận đã chuyển tiền?')) return; setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'PAID' } : p)); showToast('💸 Đã xác nhận thanh toán'); };

    const filtered = filter === 'all' ? payouts : payouts.filter(p => p.status === filter);
    const totalPending = payouts.filter(p => p.status === 'REQUESTED').reduce((s, p) => s + p.amount, 0);
    const totalApproved = payouts.filter(p => p.status === 'APPROVED').reduce((s, p) => s + p.amount, 0);

    return (
        <div className="animate-in">
            {toast && <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, padding: '12px 20px', background: 'rgba(34,197,94,0.9)', color: '#fff', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>{toast}</div>}

            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>🏦 Yêu cầu rút tiền</h1>

            <div className="zen-stat-grid">
                {[
                    { label: 'Chờ duyệt', value: String(payouts.filter(p => p.status === 'REQUESTED').length), icon: '⏳', color: 'var(--warning)' },
                    { label: 'Đã duyệt', value: String(payouts.filter(p => p.status === 'APPROVED').length), icon: '✅', color: 'var(--success)' },
                    { label: 'Tổng chờ', value: formatVND(totalPending), icon: '💰', color: 'var(--warning)' },
                    { label: 'Tổng duyệt', value: formatVND(totalApproved), icon: '💸', color: 'var(--gold-400)' },
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

            {/* Filters */}
            <div className="admin-filter-scroll" style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
                {[{ v: 'all', l: 'Tất cả' }, { v: 'REQUESTED', l: '⏳ Chờ duyệt' }, { v: 'APPROVED', l: '✅ Đã duyệt' }, { v: 'PAID', l: '💸 Đã trả' }].map(f => (
                    <button key={f.v} className="btn btn-sm" onClick={() => setFilter(f.v)}
                        style={{ background: filter === f.v ? 'rgba(212,168,83,0.15)' : 'var(--bg-tertiary)', color: filter === f.v ? 'var(--gold-400)' : 'var(--text-muted)', border: filter === f.v ? '1px solid var(--gold-400)' : '1px solid var(--border-primary)' }}>{f.l}</button>
                ))}
            </div>

            {/* Mobile Card View */}
            <div className="zen-mobile-cards">
                {filtered.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Không có yêu cầu</div>
                ) : filtered.map(p => {
                    const st = STATUS_MAP[p.status] || STATUS_MAP.REQUESTED;
                    return (
                        <div key={p.id} className="zen-mobile-card">
                            <div className="zen-mobile-card__header">
                                <div>
                                    <div className="zen-mobile-card__title" style={{ color: 'var(--gold-400)' }}>{formatVND(p.amount)}</div>
                                    <div className="zen-mobile-card__subtitle">{p.partner} · {p.name}</div>
                                </div>
                                <span className="zen-mobile-card__badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                            </div>
                            <div className="zen-mobile-card__fields">
                                <div>
                                    <div className="zen-mobile-card__field-label">Tài khoản</div>
                                    <div className="zen-mobile-card__field-value">{p.bank}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Ngày</div>
                                    <div className="zen-mobile-card__field-value">{p.date}</div>
                                </div>
                                {p.note && (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <div className="zen-mobile-card__field-label">Ghi chú</div>
                                        <div className="zen-mobile-card__field-value" style={{ color: 'var(--error)' }}>{p.note}</div>
                                    </div>
                                )}
                            </div>
                            {(p.status === 'REQUESTED' || p.status === 'APPROVED') && (
                                <div className="zen-mobile-card__actions">
                                    {p.status === 'REQUESTED' && (
                                        <>
                                            <button className="btn btn-sm btn-primary" onClick={() => approvePayout(p.id)}>✅ Duyệt</button>
                                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => rejectPayout(p.id)}>❌ Từ chối</button>
                                        </>
                                    )}
                                    {p.status === 'APPROVED' && <button className="btn btn-sm btn-primary" onClick={() => markPaid(p.id)}>💸 Thanh toán</button>}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="zen-table-desktop card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Đối tác</th><th>Số tiền</th><th>Tài khoản</th><th>Trạng thái</th><th>Ngày</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Không có yêu cầu</td></tr>
                        ) : filtered.map(p => {
                            const st = STATUS_MAP[p.status] || STATUS_MAP.REQUESTED;
                            return (
                                <tr key={p.id}>
                                    <td><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.partner}</div><div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{p.name}</div></td>
                                    <td style={{ fontWeight: 700, color: 'var(--gold-400)' }}>{formatVND(p.amount)}</td>
                                    <td style={{ fontSize: 'var(--text-xs)' }}>{p.bank}</td>
                                    <td>
                                        <span className="badge" style={{ background: st.bg, color: st.color }}>{st.icon} {st.label}</span>
                                        {p.note && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--error)', marginTop: 2 }}>{p.note}</div>}
                                    </td>
                                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{p.date}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            {p.status === 'REQUESTED' && (<><button className="btn btn-sm btn-primary" onClick={() => approvePayout(p.id)}>✓ Duyệt</button><button className="btn btn-sm btn-ghost" style={{ color: 'var(--error)' }} onClick={() => rejectPayout(p.id)}>✕</button></>)}
                                            {p.status === 'APPROVED' && <button className="btn btn-sm btn-primary" onClick={() => markPaid(p.id)}>💸 Thanh toán</button>}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
