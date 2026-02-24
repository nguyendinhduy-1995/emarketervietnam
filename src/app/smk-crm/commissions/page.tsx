'use client';

import { useState, useEffect } from 'react';

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface Commission {
    id: string; orderId: string; partnerId: string; amount: number; status: string;
    holdUntil: string | null; createdAt: string;
    partner: { partnerCode: string; level: string; user: { name: string } };
    order: { code: string; total: number; status: string; createdAt: string };
}

interface Summary { [status: string]: { total: number; count: number } }

const STATUS_INFO: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    PENDING: { label: 'Chờ', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', icon: '⏳' },
    AVAILABLE: { label: 'Sẵn sàng', color: '#22c55e', bg: 'rgba(34,197,94,0.15)', icon: '✅' },
    PAID: { label: 'Đã trả', color: 'var(--gold-400)', bg: 'rgba(212,168,83,0.15)', icon: '💸' },
    REVERSED: { label: 'Hoàn', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', icon: '↩️' },
};

export default function AdminCommissionsPage() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [summary, setSummary] = useState<Summary>({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [releaseLoading, setReleaseLoading] = useState(false);
    const [releaseResult, setReleaseResult] = useState<string | null>(null);

    const fetchData = (status?: string) => {
        setLoading(true);
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        params.set('limit', '50');
        fetch(`/api/smk/admin/commissions?${params}`)
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(res => { setCommissions(res.commissions || []); setSummary(res.summary || {}); })
            .catch(() => { setCommissions([]); setSummary({}); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchData(filter || undefined); }, [filter]);

    const handleAction = async (commId: string, action: 'release' | 'reverse') => {
        if (!confirm(`Bạn muốn ${action === 'release' ? 'giải phóng' : 'hoàn trả'} hoa hồng này?`)) return;
        setActionLoading(commId);
        try {
            await fetch('/api/smk/admin/commissions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commissionId: commId, action }) });
            fetchData(filter || undefined);
        } finally { setActionLoading(null); }
    };

    const handleAutoRelease = async () => {
        if (!confirm('Tự động giải phóng tất cả hoa hồng quá hạn hold?')) return;
        setReleaseLoading(true); setReleaseResult(null);
        try {
            const res = await fetch('/api/smk/admin/commissions/release', { method: 'POST' });
            const body = await res.json();
            setReleaseResult(`Đã xử lý ${body.processedTotal} · Giải phóng ${body.released} · Hoàn ${body.reversed} · Nâng cấp ${body.tierUpgrades?.length || 0}`);
            fetchData(filter || undefined);
        } finally { setReleaseLoading(false); }
    };

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>💰 Hoa hồng</h1>
                <button className="btn btn-primary" onClick={handleAutoRelease} disabled={releaseLoading} style={{ fontSize: 'var(--text-xs)', padding: '6px 12px' }}>
                    {releaseLoading ? '⏳ Đang...' : '⚡ Auto-release'}
                </button>
            </div>

            {releaseResult && (
                <div style={{ padding: 'var(--space-3)', background: 'rgba(34,197,94,0.1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--success)' }}>
                    ✅ {releaseResult}
                </div>
            )}

            {/* Summary Cards */}
            <div className="zen-stat-grid">
                {['PENDING', 'AVAILABLE', 'PAID', 'REVERSED'].map(st => {
                    const info = STATUS_INFO[st];
                    return (
                        <div key={st} className="admin-stat-card" style={{ cursor: 'pointer', borderColor: filter === st ? 'var(--gold-400)' : undefined }} onClick={() => setFilter(filter === st ? '' : st)}>
                            <div className="admin-stat-card__header">
                                <span className="admin-stat-card__icon">{info.icon}</span>
                                <span className="admin-stat-card__label">{info.label}</span>
                            </div>
                            <div className="admin-stat-card__value" style={{ fontSize: 'var(--text-lg)' }}>{formatVND(summary[st]?.total || 0)}</div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{summary[st]?.count || 0} commissions</div>
                        </div>
                    );
                })}
            </div>

            {/* Mobile Card View */}
            <div className="zen-mobile-cards">
                {loading ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>Đang tải...</div>
                ) : commissions.length === 0 ? (
                    <div className="card" style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)' }}>Không có dữ liệu</div>
                ) : commissions.map(c => {
                    const info = STATUS_INFO[c.status] || STATUS_INFO.PENDING;
                    return (
                        <div key={c.id} className="zen-mobile-card">
                            <div className="zen-mobile-card__header">
                                <div>
                                    <div className="zen-mobile-card__title" style={{ color: 'var(--gold-400)' }}>{formatVND(c.amount)}</div>
                                    <div className="zen-mobile-card__subtitle">{c.partner.partnerCode} · {c.partner.user.name}</div>
                                </div>
                                <span className="zen-mobile-card__badge" style={{ background: info.bg, color: info.color }}>{info.icon} {info.label}</span>
                            </div>
                            <div className="zen-mobile-card__fields">
                                <div>
                                    <div className="zen-mobile-card__field-label">Đơn hàng</div>
                                    <div className="zen-mobile-card__field-value" style={{ fontFamily: 'monospace' }}>{c.order.code}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Level</div>
                                    <div className="zen-mobile-card__field-value">{c.partner.level}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Hold đến</div>
                                    <div className="zen-mobile-card__field-value">{c.holdUntil ? new Date(c.holdUntil).toLocaleDateString('vi-VN') : '—'}</div>
                                </div>
                                <div>
                                    <div className="zen-mobile-card__field-label">Ngày tạo</div>
                                    <div className="zen-mobile-card__field-value">{new Date(c.createdAt).toLocaleDateString('vi-VN')}</div>
                                </div>
                            </div>
                            {(c.status === 'PENDING' || c.status === 'AVAILABLE') && (
                                <div className="zen-mobile-card__actions">
                                    {c.status === 'PENDING' && <button className="btn btn-sm btn-primary" disabled={actionLoading === c.id} onClick={() => handleAction(c.id, 'release')}>{actionLoading === c.id ? '...' : '✅ Giải phóng'}</button>}
                                    <button className="btn btn-sm btn-ghost" disabled={actionLoading === c.id} onClick={() => handleAction(c.id, 'reverse')} style={{ color: 'var(--error)' }}>{actionLoading === c.id ? '...' : '↩️ Hoàn'}</button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop Table */}
            <div className="zen-table-desktop card" style={{ overflow: 'auto' }}>
                <table className="data-table">
                    <thead><tr><th>Đơn hàng</th><th>Đối tác</th><th>Level</th><th>Hoa hồng</th><th>Trạng thái</th><th>Hold đến</th><th>Ngày tạo</th><th>Thao tác</th></tr></thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)' }}>Đang tải...</td></tr>
                        ) : commissions.length === 0 ? (
                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-muted)' }}>Không có dữ liệu</td></tr>
                        ) : commissions.map(c => {
                            const info = STATUS_INFO[c.status] || STATUS_INFO.PENDING;
                            return (
                                <tr key={c.id}>
                                    <td style={{ fontFamily: 'monospace', fontSize: 'var(--text-xs)' }}>{c.order.code}</td>
                                    <td><span style={{ fontWeight: 600 }}>{c.partner.partnerCode}</span><br /><span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.partner.user.name}</span></td>
                                    <td><span className="badge badge-neutral" style={{ fontSize: 10 }}>{c.partner.level}</span></td>
                                    <td style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{formatVND(c.amount)}</td>
                                    <td><span className="badge" style={{ background: info.bg, color: info.color }}>{info.icon} {info.label}</span></td>
                                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{c.holdUntil ? new Date(c.holdUntil).toLocaleDateString('vi-VN') : '—'}</td>
                                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        {c.status === 'PENDING' && (<div style={{ display: 'flex', gap: 4 }}><button className="btn btn-sm btn-primary" disabled={actionLoading === c.id} onClick={() => handleAction(c.id, 'release')}>{actionLoading === c.id ? '...' : '✓'}</button><button className="btn btn-sm btn-ghost" disabled={actionLoading === c.id} onClick={() => handleAction(c.id, 'reverse')}>✕</button></div>)}
                                        {c.status === 'AVAILABLE' && <button className="btn btn-sm btn-ghost" disabled={actionLoading === c.id} onClick={() => handleAction(c.id, 'reverse')}>✕ Hoàn</button>}
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
