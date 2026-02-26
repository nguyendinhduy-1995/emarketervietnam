'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { vnd } from '@/lib/format';

interface Order { id: string; status: string; totalAmount: number; refundedAmount: number; discountAmount: number; createdAt: string; note: string | null; items: { productId: string; quantity: number; unitPrice: number; lineTotal: number; meta?: Record<string, unknown> }[]; }
interface Receipt { id: string; type: string; amount: number; description: string; receiptNo: string; createdAt: string; }

const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
    PAID: { bg: '#d1fae5', color: '#065f46', label: 'Đã thanh toán' },
    PAID_WAITING_DOMAIN_VERIFY: { bg: '#ede9fe', color: '#5b21b6', label: '🌐 Chờ DNS' },
    DOMAIN_VERIFIED: { bg: '#dbeafe', color: '#1e40af', label: '✅ DNS OK' },
    DEPLOYING: { bg: '#fff7ed', color: '#9a3412', label: '🚀 Đang triển khai' },
    DELIVERED_ACTIVE: { bg: '#d1fae5', color: '#065f46', label: '🎉 Đã kích hoạt' },
    REFUNDED: { bg: '#fee2e2', color: '#991b1b', label: 'Đã hoàn tiền' },
    PARTIAL_REFUND: { bg: '#fce7f3', color: '#9d174d', label: 'Hoàn một phần' },
    PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Chờ thanh toán' },
    FAILED: { bg: '#fee2e2', color: '#991b1b', label: 'Thất bại' },
};

const CRM_SETUP_STATUSES = ['PAID_WAITING_DOMAIN_VERIFY', 'DOMAIN_VERIFIED', 'DEPLOYING'];

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'orders' | 'receipts'>('orders');

    useEffect(() => {
        fetch('/api/hub/orders').then(r => r.json()).then(d => {
            setOrders(d.orders || []); setReceipts(d.receipts || []); setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>📦 Đơn hàng & Phiếu thu</h1>

            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-hover)', borderRadius: '10px', padding: '3px' }}>
                {(['orders', 'receipts'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                        background: tab === t ? 'var(--bg-card)' : 'transparent', border: 'none', cursor: 'pointer',
                        boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>{t === 'orders' ? `📦 Đơn (${orders.length})` : `🧾 Phiếu thu (${receipts.length})`}</button>
                ))}
            </div>

            {loading && <div style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)' }} />}

            {!loading && tab === 'orders' && (
                orders.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', borderRadius: '16px', background: 'var(--bg-card)' }}>
                        <p style={{ fontSize: '32px', marginBottom: '8px' }}>📦</p>
                        <p style={{ fontWeight: 600 }}>Chưa có đơn hàng</p>
                        <Link href="/hub/marketplace" style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '13px' }}>Khám phá Marketplace →</Link>
                    </div>
                ) : orders.map(o => {
                    const s = STATUS_MAP[o.status] || STATUS_MAP.PENDING;
                    const isCrmSetup = CRM_SETUP_STATUSES.includes(o.status);
                    return (
                        <div key={o.id} style={{ padding: '12px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <code style={{ fontSize: '11px', fontWeight: 700 }}>#{o.id.slice(-6)}</code>
                                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {new Date(o.createdAt).toLocaleString('vi')} · {o.items.length} sản phẩm
                                    </div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 800 }}>{vnd(o.totalAmount)}</div>
                            </div>
                            {o.discountAmount > 0 && <div style={{ fontSize: '10px', color: '#059669', textAlign: 'right' }}>Giảm {vnd(o.discountAmount)}</div>}
                            {o.refundedAmount > 0 && <div style={{ fontSize: '10px', color: '#dc2626', textAlign: 'right' }}>↩️ Hoàn {vnd(o.refundedAmount)}</div>}
                            {isCrmSetup && (
                                <Link href={`/hub/setup/${o.id}`} style={{
                                    display: 'block', textAlign: 'center', marginTop: '8px',
                                    padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                    background: 'var(--accent-primary)', color: 'white', textDecoration: 'none',
                                }}>
                                    🔧 Tiếp tục cài đặt →
                                </Link>
                            )}
                            {o.status === 'DELIVERED_ACTIVE' && o.note && (() => {
                                try {
                                    const m = JSON.parse(o.note); return m.domain ? (
                                        <a href={`https://${m.domain}`} target="_blank" rel="noopener noreferrer" style={{
                                            display: 'block', textAlign: 'center', marginTop: '8px',
                                            padding: '8px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                                            background: '#22c55e', color: 'white', textDecoration: 'none',
                                        }}>🏢 Mở CRM →</a>
                                    ) : null;
                                } catch { return null; }
                            })()}
                        </div>
                    );
                })
            )}

            {!loading && tab === 'receipts' && (
                receipts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', borderRadius: '16px', background: 'var(--bg-card)' }}>
                        <p style={{ fontSize: '32px', marginBottom: '8px' }}>🧾</p>
                        <p style={{ fontWeight: 600 }}>Chưa có phiếu thu</p>
                    </div>
                ) : receipts.map(r => (
                    <div key={r.id} style={{ padding: '12px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '12px', fontWeight: 700 }}>{r.description}</div>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    <code>{r.receiptNo}</code> · {r.type} · {new Date(r.createdAt).toLocaleString('vi')}
                                </div>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 800, color: r.type === 'REFUND' ? '#059669' : 'var(--text-primary)' }}>{r.type === 'REFUND' ? '+' : ''}{vnd(r.amount)}</div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
