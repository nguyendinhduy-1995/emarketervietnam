'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Order {
    id: string; orderCode: string; amount: number; status: string; createdAt: string; expiresAt: string;
    itemsJson: Array<{ moduleName: string; months: number; subtotal: number }>;
}

export default function BillingPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/orders').then(r => r.json()).then(d => { setOrders(d.orders || []); setLoading(false); });
    }, []);

    const statusBadge = (s: string) => {
        const m: Record<string, string> = { PENDING: 'badge-warning', PAID: 'badge-success', EXPIRED: 'badge-neutral', NEED_REVIEW: 'badge-danger' };
        return m[s] || 'badge-neutral';
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1>💳 Billing & Orders</h1>
                <p>Lịch sử đơn hàng và hóa đơn</p>
            </div>

            {orders.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🧾</div>
                    <p>Chưa có đơn hàng nào</p>
                    <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: '16px' }}>
                        Khám phá Marketplace
                    </Link>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr><th>Mã đơn</th><th>Module</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày tạo</th><th></th></tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-secondary)' }}>{o.orderCode}</td>
                                    <td>{(o.itemsJson || []).map(i => i.moduleName).join(', ')}</td>
                                    <td style={{ fontWeight: 600 }}>{o.amount.toLocaleString('vi-VN')}₫</td>
                                    <td><span className={`badge ${statusBadge(o.status)}`}>{o.status}</span></td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleString('vi-VN')}</td>
                                    <td>
                                        {o.status === 'PENDING' && (
                                            <Link href={`/billing/orders/${o.id}`} className="btn btn-primary btn-sm">Thanh toán</Link>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
