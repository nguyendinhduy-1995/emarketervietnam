'use client';
import { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';

interface InvoiceInfo {
    id: string; orderCode: string; amount: number; status: string; createdAt: string;
}
interface SubInfo {
    status: string; daysLeft: number; planKey: string;
}

const STATUS_COLORS: Record<string, string> = {
    PENDING: 'var(--warning)', PAID: 'var(--success)', EXPIRED: 'var(--text-muted)', NEED_REVIEW: 'var(--accent-primary)',
};
const STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ thanh toán', PAID: 'Đã thanh toán', EXPIRED: 'Hết hạn', NEED_REVIEW: 'Đang xem xét',
};

export default function BillingPage() {
    const [sub, setSub] = useState<SubInfo | null>(null);
    const [invoices, setInvoices] = useState<InvoiceInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    useEffect(() => {
        Promise.all([
            fetch('/api/hub/subscription').then(r => r.json()),
            fetch('/api/orders').then(r => r.json()),
        ]).then(([subData, ordersData]) => {
            setSub(subData);
            setInvoices(ordersData.orders || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleUploadProof = async (orderId: string, file: File) => {
        setUploading(true);
        try {
            // For MVP: store as base64 in payloadJson. Production: use file upload service.
            const reader = new FileReader();
            reader.onload = async () => {
                const res = await fetch('/api/hub/billing/upload-proof', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId, imageData: reader.result, note: 'Chứng từ thanh toán' }),
                });
                const data = await res.json();
                if (res.ok) {
                    success('Đã gửi chứng từ! Chúng tôi sẽ xác nhận sớm.');
                    setSelectedOrder(null);
                } else {
                    toastError(data.error || 'Lỗi upload');
                }
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch {
            toastError('Lỗi kết nối');
            setUploading(false);
        }
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: i === 1 ? '120px' : '70px', borderRadius: '18px', background: 'var(--bg-card)',  }} />)}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>💳 Thanh toán</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Module đang dùng & hoá đơn</p>
            </div>

            {/* Current Plan */}
            {sub && (
                <div style={{
                    padding: '20px', borderRadius: '18px',
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(99,102,241,0.15)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '16px' }}>
                                Module {sub.planKey || 'Cơ bản'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {sub.status === 'ACTIVE' ? 'Đang hoạt động' : sub.daysLeft > 0 ? `Còn ${sub.daysLeft} ngày` : 'Cần gia hạn'}
                            </div>
                        </div>
                        <span style={{ fontSize: '24px' }}>{sub.status === 'ACTIVE' ? '✅' : '📦'}</span>
                    </div>
                </div>
            )}

            {/* Invoices */}
            <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Lịch sử hoá đơn</h2>
                {invoices.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '32px 24px', borderRadius: '18px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Chưa có hoá đơn nào</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {invoices.map(inv => (
                            <div key={inv.id} style={{
                                padding: '14px 16px', borderRadius: '16px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '14px' }}>#{inv.orderCode}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {new Date(inv.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 700 }}>{inv.amount.toLocaleString('vi-VN')}₫</div>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 600,
                                            color: STATUS_COLORS[inv.status] || 'var(--text-muted)',
                                        }}>
                                            {STATUS_LABELS[inv.status] || inv.status}
                                        </span>
                                    </div>
                                </div>

                                {inv.status === 'PENDING' && (
                                    <div style={{ marginTop: '10px' }}>
                                        {selectedOrder === inv.id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <label style={{
                                                    width: '100%', padding: '12px', borderRadius: '12px',
                                                    border: '2px dashed var(--border)', textAlign: 'center',
                                                    cursor: 'pointer', fontSize: '13px', color: 'var(--text-muted)',
                                                }}>
                                                    📎 Chọn ảnh chứng từ
                                                    <input type="file" accept="image/*" hidden
                                                        onChange={e => e.target.files?.[0] && handleUploadProof(inv.id, e.target.files[0])}
                                                    />
                                                </label>
                                                <button onClick={() => setSelectedOrder(null)} style={{
                                                    padding: '8px', borderRadius: '10px', fontSize: '13px',
                                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                                    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
                                                }}>Huỷ</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setSelectedOrder(inv.id)} disabled={uploading} style={{
                                                width: '100%', padding: '10px', borderRadius: '12px',
                                                background: 'var(--accent-gradient)', border: 'none',
                                                color: 'white', fontWeight: 600, fontSize: '13px',
                                                cursor: 'pointer', fontFamily: 'inherit',
                                            }}>
                                                📎 Upload chứng từ
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
