'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface OrderDetail {
    order: {
        id: string; orderCode: string; amount: number; status: string;
        expiresAt: string; itemsJson: Array<{ moduleName: string; months: number; priceMonthly: number; subtotal: number }>;
    };
    qrDataUrl: string | null;
}

export default function OrderDetailPage() {
    const params = useParams();
    const [data, setData] = useState<OrderDetail | null>(null);

    useEffect(() => {
        if (params.id) {
            fetch(`/api/orders/${params.id}`).then(r => r.json()).then(setData);
        }
    }, [params.id]);

    if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;

    const { order, qrDataUrl } = data;
    const isPending = order.status === 'PENDING';

    return (
        <div>
            <div className="page-header">
                <h1>Đơn hàng {order.orderCode}</h1>
                <p>Chi tiết đơn nâng cấp module</p>
            </div>

            <div className="grid grid-2">
                {/* Order details */}
                <div className="card">
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Chi tiết đơn hàng</h3>
                    {order.itemsJson.map((item, i) => (
                        <div key={i} style={{
                            display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                            borderBottom: '1px solid var(--border)',
                        }}>
                            <div>
                                <div style={{ fontWeight: 500 }}>{item.moduleName}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.months} tháng × {item.priceMonthly.toLocaleString('vi-VN')}₫</div>
                            </div>
                            <div style={{ fontWeight: 600 }}>{item.subtotal.toLocaleString('vi-VN')}₫</div>
                        </div>
                    ))}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', padding: '16px 0',
                        fontSize: '20px', fontWeight: 700, color: 'var(--accent-secondary)',
                    }}>
                        <span>Tổng cộng</span>
                        <span>{order.amount.toLocaleString('vi-VN')}₫</span>
                    </div>
                    <div style={{ marginTop: '12px' }}>
                        <span className={`badge ${order.status === 'PAID' ? 'badge-success' : order.status === 'PENDING' ? 'badge-warning' : 'badge-danger'}`}>
                            {order.status}
                        </span>
                    </div>
                </div>

                {/* Payment QR */}
                {isPending && qrDataUrl && (
                    <div className="card" style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '20px' }}>Chuyển khoản thanh toán</h3>
                        <div className="qr-container" style={{ marginBottom: '20px' }}>
                            <img src={qrDataUrl} alt="QR chuyển khoản" />
                        </div>
                        <div style={{ textAlign: 'left', background: 'var(--bg-input)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
                            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                <strong style={{ color: 'var(--text-primary)' }}>Nội dung chuyển khoản:</strong>
                            </p>
                            <p style={{
                                fontSize: '20px', fontWeight: 700, color: 'var(--accent-primary)',
                                fontFamily: 'var(--font-mono)', letterSpacing: '2px', margin: '8px 0',
                            }}>
                                {order.orderCode}
                            </p>
                            <p style={{ fontSize: '13px', color: 'var(--warning)', marginTop: '12px' }}>
                                ⚠️ Vui lòng ghi đúng nội dung chuyển khoản để hệ thống tự xác nhận
                            </p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                Đơn hết hạn: {new Date(order.expiresAt).toLocaleString('vi-VN')}
                            </p>
                        </div>
                    </div>
                )}

                {order.status === 'PAID' && (
                    <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                        <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Thanh toán thành công!</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            Module đã được kích hoạt. Quay lại Dashboard để sử dụng.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
