'use client';
import { useEffect, useState, useCallback } from 'react';

// ─── Types ───
interface AffStats { totalClicks: number; referrals: number; totalCommission: number; pendingCommission: number; paidCommission: number; commissionCount: number }
interface AffLink { refCode: string; clicks: number; targetUrl?: string }
interface Affiliate { id: string; name: string; email: string | null; phone: string | null; status: string; createdAt: string; links: AffLink[]; stats: AffStats }
interface Overview { totalAffiliates: number; activeAffiliates: number; totalClicks: number; totalReferrals: number; totalCommission: number; pendingPayout: number }
interface Commission { id: string; affiliateId: string; amount: number; status: string; createdAt: string; approvedAt: string | null; paidAt: string | null; affiliate: { name: string } }
interface CommStats { total: { amount: number; count: number }; pending: { amount: number; count: number }; approved: { amount: number; count: number }; paid: { amount: number; count: number } }
interface PayoutItem { id: string; affiliateId: string; amount: number; status: string; affiliateName: string; proofUrl?: string }
interface PayoutBatch { id: string; month: string; total: number; status: string; note: string | null; items: PayoutItem[]; createdAt: string }

type Tab = 'affiliates' | 'commissions' | 'payouts';

import { vnd } from '@/lib/format';

export default function AffiliatesPage() {
    const [tab, setTab] = useState<Tab>('affiliates');

    const tabs: { key: Tab; icon: string; label: string }[] = [
        { key: 'affiliates', icon: '🤝', label: 'Đại lý' },
        { key: 'commissions', icon: '💎', label: 'Hoa hồng' },
        { key: 'payouts', icon: '💰', label: 'Chi trả' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg> Đại lý &amp; Hoa hồng</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Quản lý chương trình giới thiệu, hoa hồng và chi trả
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
                        background: tab === t.key ? 'var(--accent-primary)' : 'transparent',
                        color: tab === t.key ? 'white' : 'var(--text-secondary)',
                        fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 150ms ease',
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'affiliates' && <AffiliatesTab />}
            {tab === 'commissions' && <CommissionsTab />}
            {tab === 'payouts' && <PayoutsTab />}
        </div>
    );
}

// ═══════════════════════ TAB 1: ĐẠI LÝ ═══════════════════════
function AffiliatesTab() {
    const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', phone: '' });
    const [adding, setAdding] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/affiliates').then(r => r.json()).then(d => {
            setAffiliates(d.affiliates || []);
            setOverview(d.overview || null);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    const addAffiliate = async () => {
        if (!form.name.trim()) return;
        setAdding(true);
        await fetch('/api/emk-crm/affiliates', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        setForm({ name: '', email: '', phone: '' });
        setShowAdd(false);
        setAdding(false);
        load();
    };

    const toggleStatus = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        await fetch('/api/emk-crm/affiliates', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: newStatus }),
        });
        load();
    };

    if (loading) return <LoadingSkeleton />;

    return (
        <>
            {/* KPI Cards */}
            {overview && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                    {[
                        { label: 'Tổng đại lý', value: overview.totalAffiliates, icon: '🤝' },
                        { label: 'Đang hoạt động', value: overview.activeAffiliates, icon: '🟢' },
                        { label: 'Tổng lượt click', value: overview.totalClicks, icon: '🔗' },
                        { label: 'Giới thiệu', value: overview.totalReferrals, icon: '👥' },
                        { label: 'Tổng hoa hồng', value: vnd(overview.totalCommission), icon: '💎' },
                        { label: 'Chờ chi trả', value: vnd(overview.pendingPayout), icon: '⏳' },
                    ].map((k, i) => (
                        <div key={i} style={{
                            padding: '12px', borderRadius: '12px', background: 'var(--bg-card)',
                            border: '1px solid var(--border)', textAlign: 'center',
                        }}>
                            <div style={{ fontSize: '16px', marginBottom: '4px' }}>{k.icon}</div>
                            <div style={{ fontWeight: 800, fontSize: '18px' }}>{k.value}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{k.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAdd(!showAdd)} style={{
                    padding: '8px 16px', borderRadius: '10px',
                    background: showAdd ? 'var(--bg-input)' : 'var(--accent-primary)',
                    border: showAdd ? '1px solid var(--border)' : 'none',
                    color: showAdd ? 'var(--text-secondary)' : 'white',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}>
                    {showAdd ? 'Huỷ' : '+ Thêm đại lý'}
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div style={{
                    padding: '16px', borderRadius: '14px',
                    background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-primary)' }}>Thêm đại lý mới</div>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        placeholder="Tên đại lý *" style={inputStyle} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Số điện thoại" type="tel" style={inputStyle} />
                        <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                            placeholder="Email (tùy chọn)" type="email" style={inputStyle} />
                    </div>
                    <button onClick={addAffiliate} disabled={adding || !form.name.trim()} style={{
                        padding: '10px', borderRadius: '10px',
                        background: form.name.trim() ? 'var(--accent-primary)' : 'var(--bg-input)',
                        border: 'none', color: form.name.trim() ? 'white' : 'var(--text-muted)',
                        fontWeight: 700, cursor: form.name.trim() ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                    }}>
                        {adding ? 'Đang tạo...' : 'Tạo đại lý'}
                    </button>
                </div>
            )}

            {/* Affiliate list */}
            {affiliates.length === 0 ? (
                <EmptyState icon="🤝" title="Chưa có đại lý nào" desc="Nhấn 'Thêm đại lý' để bắt đầu chương trình giới thiệu" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {affiliates.map(a => (
                        <div key={a.id} style={{
                            padding: '14px 16px', borderRadius: '14px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            opacity: a.status === 'ACTIVE' ? 1 : 0.6,
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '50%',
                                        background: a.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(107,114,128,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '15px', fontWeight: 800,
                                        color: a.status === 'ACTIVE' ? '#22c55e' : '#6b7280',
                                    }}>
                                        {a.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '14px' }}>{a.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {a.phone || a.email || 'Chưa có liên hệ'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button onClick={() => toggleStatus(a.id, a.status)} style={{
                                        padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        border: 'none', cursor: 'pointer',
                                        background: a.status === 'ACTIVE' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
                                        color: a.status === 'ACTIVE' ? '#22c55e' : '#f59e0b',
                                    }}>
                                        {a.status === 'ACTIVE' ? '✅ Hoạt động' : '⏸ Tạm dừng'}
                                    </button>
                                </div>
                            </div>

                            {/* Ref links */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                                {a.links.map(l => (
                                    <span key={l.refCode} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
                                        background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    }}>
                                        🔗 <code style={{ fontSize: '10px' }}>{l.refCode}</code>
                                        <span style={{ color: 'var(--text-muted)' }}>({l.clicks} click)</span>
                                    </span>
                                ))}
                            </div>

                            {/* Stats row */}
                            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
                                <span>👥 {a.stats.referrals} giới thiệu</span>
                                <span>💎 {vnd(a.stats.totalCommission)} hoa hồng</span>
                                {a.stats.pendingCommission > 0 && (
                                    <span style={{ color: '#f59e0b' }}>⏳ {vnd(a.stats.pendingCommission)} chờ duyệt</span>
                                )}
                                {a.stats.paidCommission > 0 && (
                                    <span style={{ color: '#22c55e' }}>✅ {vnd(a.stats.paidCommission)} đã trả</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ═══════════════════════ TAB 2: HOA HỒNG ═══════════════════════
function CommissionsTab() {
    const [commissions, setCommissions] = useState<Commission[]>([]);
    const [stats, setStats] = useState<CommStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [affiliates, setAffiliates] = useState<{ id: string; name: string }[]>([]);
    const [addForm, setAddForm] = useState({ affiliateId: '', amount: '' });
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const load = useCallback(() => {
        setLoading(true);
        const params = filter ? `?status=${filter}` : '';
        fetch(`/api/emk-crm/commissions${params}`).then(r => r.json()).then(d => {
            setCommissions(d.commissions || []);
            setStats(d.stats || null);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [filter]);
    useEffect(load, [load]);

    useEffect(() => {
        fetch('/api/emk-crm/affiliates').then(r => r.json())
            .then(d => setAffiliates((d.affiliates || []).map((a: Affiliate) => ({ id: a.id, name: a.name }))));
    }, []);

    const addCommission = async () => {
        if (!addForm.affiliateId || !addForm.amount) return;
        await fetch('/api/emk-crm/commissions', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ affiliateId: addForm.affiliateId, amount: Number(addForm.amount) }),
        });
        setAddForm({ affiliateId: '', amount: '' });
        setShowAdd(false);
        load();
    };

    const updateStatus = async (ids: string[], status: string) => {
        await fetch('/api/emk-crm/commissions', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids, status }),
        });
        setSelected(new Set());
        load();
    };

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const n = new Set(prev);
            if (n.has(id)) { n.delete(id); } else { n.add(id); }
            return n;
        });
    };

    if (loading) return <LoadingSkeleton />;

    const STATUS_VN: Record<string, string> = { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', PAID: 'Đã trả', REJECTED: 'Từ chối' };
    const STATUS_COLORS: Record<string, string> = { PENDING: '#f59e0b', APPROVED: '#3b82f6', PAID: '#22c55e', REJECTED: '#ef4444' };

    return (
        <>
            {/* KPI */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {[
                        { label: 'Tổng', value: vnd(stats.total.amount), sub: `${stats.total.count} khoản`, color: '#6366f1' },
                        { label: 'Chờ duyệt', value: vnd(stats.pending.amount), sub: `${stats.pending.count} khoản`, color: '#f59e0b' },
                        { label: 'Đã duyệt', value: vnd(stats.approved.amount), sub: `${stats.approved.count} khoản`, color: '#3b82f6' },
                        { label: 'Đã trả', value: vnd(stats.paid.amount), sub: `${stats.paid.count} khoản`, color: '#22c55e' },
                    ].map((k, i) => (
                        <div key={i} style={{
                            padding: '12px', borderRadius: '12px', background: 'var(--bg-card)',
                            border: `1px solid ${k.color}20`,
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{k.label}</div>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: k.color }}>{k.value}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{k.sub}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {['', 'PENDING', 'APPROVED', 'PAID'].map(f => (
                        <button key={f} onClick={() => setFilter(f)} style={{
                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                            border: filter === f ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                            background: filter === f ? 'rgba(99,102,241,0.1)' : 'transparent',
                            color: filter === f ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                            {f === '' ? 'Tất cả' : STATUS_VN[f]}
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    {selected.size > 0 && (
                        <>
                            <button onClick={() => updateStatus([...selected], 'APPROVED')} style={bulkBtnStyle('#3b82f6')}>
                                ✅ Duyệt ({selected.size})
                            </button>
                            <button onClick={() => updateStatus([...selected], 'REJECTED')} style={bulkBtnStyle('#ef4444')}>
                                ❌ Từ chối
                            </button>
                        </>
                    )}
                    <button onClick={() => setShowAdd(!showAdd)} style={{
                        padding: '6px 14px', borderRadius: '8px', background: 'var(--accent-primary)',
                        border: 'none', color: 'white', fontWeight: 600, fontSize: '12px',
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        + Thêm hoa hồng
                    </button>
                </div>
            </div>

            {/* Add commission form */}
            {showAdd && (
                <div style={{
                    padding: '14px', borderRadius: '12px',
                    background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)',
                    display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center',
                }}>
                    <select value={addForm.affiliateId} onChange={e => setAddForm(f => ({ ...f, affiliateId: e.target.value }))}
                        style={{ ...inputStyle, flex: 1, minWidth: '150px' }}>
                        <option value="">-- Chọn đại lý --</option>
                        {affiliates.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <input type="number" placeholder="Số tiền (VNĐ)" value={addForm.amount}
                        onChange={e => setAddForm(f => ({ ...f, amount: e.target.value }))}
                        style={{ ...inputStyle, flex: 1, minWidth: '120px' }} />
                    <button onClick={addCommission} disabled={!addForm.affiliateId || !addForm.amount} style={{
                        padding: '10px 16px', borderRadius: '10px', background: 'var(--accent-primary)',
                        border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                        Tạo
                    </button>
                </div>
            )}

            {/* Commission list */}
            {commissions.length === 0 ? (
                <EmptyState icon="💎" title="Chưa có hoa hồng" desc="Tạo hoa hồng cho đại lý khi có giới thiệu thành công" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {commissions.map(c => (
                        <div key={c.id} style={{
                            padding: '12px 14px', borderRadius: '12px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            display: 'flex', alignItems: 'center', gap: '10px',
                        }}>
                            {c.status === 'PENDING' && (
                                <input type="checkbox" checked={selected.has(c.id)}
                                    onChange={() => toggleSelect(c.id)}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                            )}
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{c.affiliate?.name || 'Không rõ'}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                    {new Date(c.createdAt).toLocaleDateString('vi-VN')}
                                </div>
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '14px' }}>{vnd(c.amount)}</div>
                            <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                color: STATUS_COLORS[c.status] || '#6b7280',
                                background: `${STATUS_COLORS[c.status] || '#6b7280'}15`,
                            }}>
                                {STATUS_VN[c.status] || c.status}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ═══════════════════════ TAB 3: CHI TRẢ ═══════════════════════
function PayoutsTab() {
    const [batches, setBatches] = useState<PayoutBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/payouts').then(r => r.json()).then(d => {
            setBatches(d.batches || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    const createBatch = async () => {
        setCreating(true);
        const res = await fetch('/api/emk-crm/payouts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month: new Date().toISOString().slice(0, 7) }),
        });
        const data = await res.json();
        if (data.error) {
            alert(data.error);
        }
        setCreating(false);
        load();
    };

    const updateBatchStatus = async (id: string, status: string) => {
        await fetch('/api/emk-crm/payouts', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        load();
    };

    if (loading) return <LoadingSkeleton />;

    const totalPaid = batches.filter(b => b.status === 'PAID').reduce((s, b) => s + b.total, 0);
    const totalPending = batches.filter(b => b.status === 'DRAFT').reduce((s, b) => s + b.total, 0);

    const STATUS_VN: Record<string, string> = { DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt', PAID: 'Đã trả' };
    const STATUS_COLORS: Record<string, string> = { DRAFT: '#f59e0b', APPROVED: '#3b82f6', PAID: '#22c55e' };

    const formatMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return `Tháng ${parseInt(mo)}/${y}`;
    };

    return (
        <>
            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đợt chi trả</div>
                    <div style={{ fontWeight: 800, fontSize: '20px' }}>{batches.length}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(34,197,94,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Đã trả</div>
                    <div style={{ fontWeight: 800, fontSize: '20px', color: '#22c55e' }}>{vnd(totalPaid)}</div>
                </div>
                <div style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chờ xử lý</div>
                    <div style={{ fontWeight: 800, fontSize: '20px', color: '#f59e0b' }}>{vnd(totalPending)}</div>
                </div>
            </div>

            {/* Create batch button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={createBatch} disabled={creating} style={{
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'var(--accent-primary)', border: 'none', color: 'white',
                    fontWeight: 600, fontSize: '13px', cursor: creating ? 'wait' : 'pointer',
                    fontFamily: 'inherit', opacity: creating ? 0.7 : 1,
                }}>
                    {creating ? 'Đang tạo...' : '+ Tạo đợt chi trả'}
                </button>
            </div>

            {/* Batch list */}
            {batches.length === 0 ? (
                <EmptyState icon="💰" title="Chưa có đợt chi trả" desc="Duyệt hoa hồng trước, sau đó tạo đợt chi trả" />
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {batches.map(b => (
                        <div key={b.id} style={{
                            padding: '16px', borderRadius: '14px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>📅 {formatMonth(b.month)}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {b.items.length} đại lý · {new Date(b.createdAt).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{vnd(b.total)}</div>
                                    <span style={{
                                        padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                        color: STATUS_COLORS[b.status] || '#6b7280',
                                        background: `${STATUS_COLORS[b.status] || '#6b7280'}15`,
                                    }}>
                                        {STATUS_VN[b.status] || b.status}
                                    </span>
                                </div>
                            </div>

                            {/* Items */}
                            {b.items.length > 0 && (
                                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {b.items.map(item => (
                                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0' }}>
                                            <span>{item.affiliateName}</span>
                                            <span style={{ fontWeight: 700 }}>{vnd(item.amount)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Actions */}
                            {b.status !== 'PAID' && (
                                <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                                    {b.status === 'DRAFT' && (
                                        <button onClick={() => updateBatchStatus(b.id, 'APPROVED')} style={bulkBtnStyle('#3b82f6')}>
                                            ✅ Duyệt
                                        </button>
                                    )}
                                    {(b.status === 'DRAFT' || b.status === 'APPROVED') && (
                                        <button onClick={() => updateBatchStatus(b.id, 'PAID')} style={bulkBtnStyle('#22c55e')}>
                                            💰 Đánh dấu đã trả
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
}

// ─── Shared Components & Utils ───
function LoadingSkeleton() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '72px', borderRadius: '12px', background: 'var(--bg-card)', animation: 'affPulse 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes affPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
    return (
        <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{icon}</div>
            <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{title}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{desc}</p>
        </div>
    );
}

const inputStyle: React.CSSProperties = {
    padding: '10px 12px', borderRadius: '10px', fontSize: '14px',
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', fontFamily: 'inherit', outline: 'none',
    width: '100%', boxSizing: 'border-box',
};

const bulkBtnStyle = (color: string): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
    border: `1px solid ${color}30`, background: `${color}10`, color,
    cursor: 'pointer', fontFamily: 'inherit',
});
