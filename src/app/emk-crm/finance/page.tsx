'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';

/* ═══ TYPES ═══ */
interface Order { id: string; userId: string; orgId: string | null; source: string; status: string; totalAmount: number; refundedAmount: number; discountAmount: number; couponId: string | null; currency: string; createdAt: string; items: OrderItem[]; }
interface OrderItem { id: string; productId: string; planId: string | null; quantity: number; unitPrice: number; lineTotal: number; }
interface RefundRecord { id: string; orderId: string; userId: string; amount: number; type: string; reason: string; status: string; processedBy: string | null; createdAt: string; }
interface Coupon { id: string; code: string; type: string; value: number; minOrderAmount: number; maxDiscount: number | null; maxUses: number; usedCount: number; productIds: string[]; startsAt: string; expiresAt: string | null; isActive: boolean; createdAt: string; _count?: { redemptions: number }; }
interface ReconReport { period: { from: string; to: string }; topups: { total: number; count: number }; debits: { total: number; count: number }; refunds: { total: number; count: number }; net: number; orders: { status: string; total: number; count: number }[]; usage: { total: number; count: number }; subscriptions: { active: number; trial: number }; }

type Tab = 'orders' | 'refunds' | 'coupons' | 'reconciliation';

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
    PAID: { bg: '#d1fae5', color: '#065f46' }, PENDING: { bg: '#fef3c7', color: '#92400e' },
    REFUNDED: { bg: '#fee2e2', color: '#991b1b' }, PARTIAL_REFUND: { bg: '#fce7f3', color: '#9d174d' },
    FAILED: { bg: '#f3f4f6', color: '#6b7280' }, PROCESSED: { bg: '#d1fae5', color: '#065f46' },
    APPROVED: { bg: '#dbeafe', color: '#1e40af' }, REJECTED: { bg: '#fee2e2', color: '#991b1b' },
};

export default function FinancePage() {
    const [tab, setTab] = useState<Tab>('orders');
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<Order[]>([]);
    const [refunds, setRefunds] = useState<RefundRecord[]>([]);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [recon, setRecon] = useState<ReconReport | null>(null);

    // Refund form
    const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
    const [refundReason, setRefundReason] = useState('');
    const [refundAmount, setRefundAmount] = useState('');
    const [refunding, setRefunding] = useState(false);

    // Coupon form
    const [showCouponForm, setShowCouponForm] = useState(false);
    const [couponForm, setCouponForm] = useState({ code: '', type: 'PERCENT', value: '', minOrderAmount: '', maxDiscount: '', maxUses: '', expiresAt: '' });

    // Recon filters
    const [reconFrom, setReconFrom] = useState('');
    const [reconTo, setReconTo] = useState('');

    const loadOrders = useCallback(async () => { const r = await fetch('/api/emk-crm/orders'); if (r.ok) setOrders(await r.json()); }, []);
    const loadRefunds = useCallback(async () => { const r = await fetch('/api/emk-crm/refunds'); if (r.ok) setRefunds(await r.json()); }, []);
    const loadCoupons = useCallback(async () => { const r = await fetch('/api/emk-crm/coupons'); if (r.ok) setCoupons(await r.json()); }, []);
    const loadRecon = useCallback(async () => {
        const params = new URLSearchParams();
        if (reconFrom) params.set('from', reconFrom);
        if (reconTo) params.set('to', reconTo);
        const r = await fetch(`/api/emk-crm/reconciliation?${params}`);
        if (r.ok) setRecon(await r.json());
    }, [reconFrom, reconTo]);

    useEffect(() => {
        Promise.all([loadOrders(), loadRefunds(), loadCoupons(), loadRecon()]).then(() => setLoading(false));
    }, [loadOrders, loadRefunds, loadCoupons, loadRecon]);

    /* ═══ Refund ═══ */
    const processRefund = async () => {
        if (!refundOrderId || !refundReason) return;
        setRefunding(true);
        const res = await fetch('/api/emk-crm/refunds', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: refundOrderId, reason: refundReason, amount: refundAmount ? parseInt(refundAmount) : undefined }),
        });
        if (res.ok) { setRefundOrderId(null); setRefundReason(''); setRefundAmount(''); loadRefunds(); loadOrders(); }
        else { const e = await res.json(); alert(e.error); }
        setRefunding(false);
    };

    /* ═══ Coupon ═══ */
    const saveCoupon = async () => {
        const res = await fetch('/api/emk-crm/coupons', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                code: couponForm.code, type: couponForm.type, value: parseInt(couponForm.value) || 0,
                minOrderAmount: parseInt(couponForm.minOrderAmount) || 0,
                maxDiscount: couponForm.maxDiscount ? parseInt(couponForm.maxDiscount) : null,
                maxUses: parseInt(couponForm.maxUses) || 0,
                expiresAt: couponForm.expiresAt || null,
            }),
        });
        if (res.ok) { setShowCouponForm(false); setCouponForm({ code: '', type: 'PERCENT', value: '', minOrderAmount: '', maxDiscount: '', maxUses: '', expiresAt: '' }); loadCoupons(); }
        else { const e = await res.json(); alert(e.error); }
    };

    const deactivateCoupon = async (id: string) => {
        await fetch(`/api/emk-crm/coupons?id=${id}`, { method: 'DELETE' });
        loadCoupons();
    };

    const exportCsv = () => {
        const params = new URLSearchParams();
        if (reconFrom) params.set('from', reconFrom);
        if (reconTo) params.set('to', reconTo);
        params.set('format', 'csv');
        window.open(`/api/emk-crm/reconciliation?${params}`, '_blank');
    };

    const tabs: { key: Tab; label: string; count?: number }[] = [
        { key: 'orders', label: `📦 Đơn hàng`, count: orders.length },
        { key: 'refunds', label: `↩️ Hoàn tiền`, count: refunds.length },
        { key: 'coupons', label: `🎫 Mã giảm`, count: coupons.length },
        { key: 'reconciliation', label: `📊 Đối soát` },
    ];

    return (
        <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>💰 Tài chính</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Đơn hàng · Hoàn tiền · Mã giảm giá · Đối soát</p>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'var(--bg-hover)', borderRadius: '12px', padding: '3px', overflowX: 'auto' }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, padding: '8px 4px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                        background: tab === t.key ? 'var(--bg-card)' : 'transparent', border: 'none', cursor: 'pointer',
                        boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none', whiteSpace: 'nowrap',
                    }}>{t.label}{t.count !== undefined ? ` (${t.count})` : ''}</button>
                ))}
            </div>

            {loading && <div className="emk-skeleton" style={{ height: '100px', borderRadius: '12px' }} />}

            {/* ═══ ORDERS ═══ */}
            {!loading && tab === 'orders' && (
                <>
                    {orders.length === 0 ? (
                        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>📦</p>
                            <p style={{ fontWeight: 600 }}>Chưa có đơn hàng</p>
                        </div>
                    ) : orders.map(o => {
                        const sc = STATUS_COLOR[o.status] || STATUS_COLOR.PENDING;
                        return (
                            <div key={o.id} className="card" style={{ padding: '12px', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                            <code style={{ fontSize: '11px', fontWeight: 700 }}>#{o.id.slice(-6)}</code>
                                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: sc.bg, color: sc.color }}>{o.status}</span>
                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{o.source}</span>
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            User: {o.userId.slice(-6)} · {new Date(o.createdAt).toLocaleString('vi')}
                                        </div>
                                        {o.items.length > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{o.items.length} sản phẩm</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{vnd(o.totalAmount)}</div>
                                        {o.discountAmount > 0 && <div style={{ fontSize: '10px', color: '#059669' }}>-{vnd(o.discountAmount)}</div>}
                                        {o.refundedAmount > 0 && <div style={{ fontSize: '10px', color: '#991b1b' }}>↩️ {vnd(o.refundedAmount)}</div>}
                                    </div>
                                    {o.status === 'PAID' && (
                                        <button onClick={() => setRefundOrderId(o.id)} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>↩️</button>
                                    )}
                                </div>

                                {/* Inline refund form */}
                                {refundOrderId === o.id && (
                                    <div style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', background: 'var(--bg-hover)' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '6px' }}>↩️ Hoàn tiền cho #{o.id.slice(-6)}</div>
                                        <input placeholder="Lý do hoàn tiền *" value={refundReason} onChange={e => setRefundReason(e.target.value)} className="emk-input" style={{ width: '100%', marginBottom: '6px' }} />
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input type="number" placeholder={`Số tiền (mặc định: ${vnd(o.totalAmount - o.refundedAmount)})`} value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="emk-input" style={{ flex: 1 }} />
                                            <button onClick={processRefund} disabled={refunding || !refundReason} className="emk-btn-primary" style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, opacity: refunding || !refundReason ? 0.5 : 1 }}>{refunding ? '⏳' : '✓ Hoàn'}</button>
                                            <button onClick={() => { setRefundOrderId(null); setRefundReason(''); setRefundAmount(''); }} style={{ padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </>
            )}

            {/* ═══ REFUNDS ═══ */}
            {!loading && tab === 'refunds' && (
                <>
                    {refunds.length === 0 ? (
                        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>↩️</p>
                            <p style={{ fontWeight: 600 }}>Chưa có hoàn tiền</p>
                        </div>
                    ) : refunds.map(r => {
                        const sc = STATUS_COLOR[r.status] || STATUS_COLOR.PENDING;
                        return (
                            <div key={r.id} className="card" style={{ padding: '12px', marginBottom: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: sc.bg, color: sc.color }}>{r.status}</span>
                                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 600, background: 'var(--bg-hover)' }}>{r.type}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', marginTop: '4px' }}>{r.reason}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            Đơn #{r.orderId.slice(-6)} · {new Date(r.createdAt).toLocaleString('vi')}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>+{vnd(r.amount)}</div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}

            {/* ═══ COUPONS ═══ */}
            {!loading && tab === 'coupons' && (
                <>
                    <button onClick={() => setShowCouponForm(true)} className="emk-btn-primary" style={{ padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', width: '100%', marginBottom: '12px' }}>+ Tạo mã giảm giá</button>

                    {showCouponForm && (
                        <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>🎫 Tạo mã giảm giá</h3>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input placeholder="Mã code *" value={couponForm.code} onChange={e => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })} className="emk-input" style={{ flex: 1 }} />
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    {['PERCENT', 'FIXED'].map(t => (
                                        <button key={t} onClick={() => setCouponForm({ ...couponForm, type: t })} style={{
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                            border: '2px solid', cursor: 'pointer',
                                            borderColor: couponForm.type === t ? 'var(--accent-primary)' : 'var(--border)',
                                            background: couponForm.type === t ? 'var(--accent-primary)' : 'transparent',
                                            color: couponForm.type === t ? '#fff' : 'var(--text-primary)',
                                        }}>{t === 'PERCENT' ? '%' : '₫'}</button>
                                    ))}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Giá trị {couponForm.type === 'PERCENT' ? '(%)' : '(VND)'}</label>
                                    <input type="number" value={couponForm.value} onChange={e => setCouponForm({ ...couponForm, value: e.target.value })} className="emk-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Đơn tối thiểu</label>
                                    <input type="number" value={couponForm.minOrderAmount} onChange={e => setCouponForm({ ...couponForm, minOrderAmount: e.target.value })} className="emk-input" style={{ width: '100%' }} />
                                </div>
                                {couponForm.type === 'PERCENT' && (
                                    <div style={{ flex: 1 }}>
                                        <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Giảm tối đa</label>
                                        <input type="number" value={couponForm.maxDiscount} onChange={e => setCouponForm({ ...couponForm, maxDiscount: e.target.value })} className="emk-input" style={{ width: '100%' }} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Số lượt (0 = vô hạn)</label>
                                    <input type="number" value={couponForm.maxUses} onChange={e => setCouponForm({ ...couponForm, maxUses: e.target.value })} className="emk-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Hết hạn</label>
                                    <input type="date" value={couponForm.expiresAt} onChange={e => setCouponForm({ ...couponForm, expiresAt: e.target.value })} className="emk-input" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={saveCoupon} disabled={!couponForm.code || !couponForm.value} className="emk-btn-primary" style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '12px' }}>✓ Tạo mã</button>
                                <button onClick={() => setShowCouponForm(false)} style={{ padding: '9px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                            </div>
                        </div>
                    )}

                    {coupons.length === 0 ? (
                        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>🎫</p>
                            <p style={{ fontWeight: 600 }}>Chưa có mã giảm giá</p>
                        </div>
                    ) : coupons.map(c => (
                        <div key={c.id} className="card" style={{ padding: '12px', marginBottom: '6px', opacity: c.isActive ? 1 : 0.5 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <code style={{ fontSize: '14px', fontWeight: 800, color: 'var(--accent-primary)', letterSpacing: '1px' }}>{c.code}</code>
                                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: c.isActive ? '#d1fae5' : '#f3f4f6', color: c.isActive ? '#065f46' : '#6b7280' }}>{c.isActive ? 'Hoạt động' : 'Tắt'}</span>
                                    </div>
                                    <div style={{ fontSize: '11px', marginTop: '2px' }}>
                                        {c.type === 'PERCENT' ? `Giảm ${c.value}%` : `Giảm ${vnd(c.value)}`}
                                        {c.minOrderAmount > 0 && ` · Đơn tối thiểu ${vnd(c.minOrderAmount)}`}
                                        {c.maxDiscount && ` · Tối đa ${vnd(c.maxDiscount)}`}
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        Đã dùng: {c.usedCount}{c.maxUses > 0 ? `/${c.maxUses}` : ''}
                                        {c.expiresAt && ` · HH: ${new Date(c.expiresAt).toLocaleDateString('vi')}`}
                                    </div>
                                </div>
                                {c.isActive && (
                                    <button onClick={() => deactivateCoupon(c.id)} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>Tắt</button>
                                )}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* ═══ RECONCILIATION ═══ */}
            {!loading && tab === 'reconciliation' && (
                <>
                    {/* Date filters */}
                    <div className="card" style={{ padding: '12px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'end' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Từ ngày</label>
                                <input type="date" value={reconFrom} onChange={e => setReconFrom(e.target.value)} className="emk-input" style={{ width: '100%' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Đến ngày</label>
                                <input type="date" value={reconTo} onChange={e => setReconTo(e.target.value)} className="emk-input" style={{ width: '100%' }} />
                            </div>
                            <button onClick={loadRecon} className="emk-btn-primary" style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>🔍</button>
                            <button onClick={exportCsv} style={{ padding: '8px 14px', borderRadius: '8px', background: '#059669', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>📥 CSV</button>
                        </div>
                    </div>

                    {recon && (
                        <>
                            {/* Summary cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                                <StatCard label="💰 Tổng nạp" value={recon.topups.total} count={recon.topups.count} color="#059669" />
                                <StatCard label="💸 Tổng chi" value={recon.debits.total} count={recon.debits.count} color="#dc2626" />
                                <StatCard label="↩️ Hoàn tiền" value={recon.refunds.total} count={recon.refunds.count} color="#f59e0b" />
                                <StatCard label="📊 Net" value={recon.net} color={recon.net >= 0 ? '#059669' : '#dc2626'} />
                            </div>

                            {/* Orders by status */}
                            <div className="card" style={{ padding: '12px', marginBottom: '8px' }}>
                                <h3 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>📦 Đơn hàng theo trạng thái</h3>
                                {recon.orders.map(o => (
                                    <div key={o.status} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                                        <span style={{ fontWeight: 600 }}>{o.status}</span>
                                        <span><strong>{vnd(o.total)}</strong> ({o.count} đơn)</span>
                                    </div>
                                ))}
                            </div>

                            {/* Usage + Subs */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                <div className="card" style={{ padding: '12px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>⚡ PAYG Usage</div>
                                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#f59e0b' }}>{vnd(recon.usage.total)}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{recon.usage.count} lượt</div>
                                </div>
                                <div className="card" style={{ padding: '12px' }}>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>🔄 Subscriptions</div>
                                    <div style={{ fontSize: '18px', fontWeight: 800 }}>{recon.subscriptions.active}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Active · {recon.subscriptions.trial} trial</div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    );
}

function StatCard({ label, value, count, color }: { label: string; value: number; count?: number; color: string }) {
    return (
        <div className="card" style={{ padding: '12px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color }}>{vnd(value)}</div>
            {count !== undefined && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{count} giao dịch</div>}
        </div>
    );
}
