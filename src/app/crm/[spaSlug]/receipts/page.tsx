'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Receipt {
    id: string; total: number; paid: number; remaining: number; createdAt: string;
    customer: { name: string; phone: string | null };
    items: Array<{ qty: number; price: number; service: { name: string } }>;
}

export default function CrmReceiptsPage() {
    const { spaSlug } = useParams();
    const [receipts, setReceipts] = useState<Receipt[]>([]);

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/receipts`).then(r => r.json()).then(d => setReceipts(d.receipts || []));
    }, [spaSlug]);

    return (
        <div>
            <div className="page-header">
                <h1>🧾 Phiếu thu</h1>
                <p>Lịch sử phiếu thu và doanh thu</p>
            </div>

            {receipts.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🧾</div><p>Chưa có phiếu thu</p></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Tổng</th><th>Đã TT</th><th>Còn lại</th><th>Ngày</th></tr></thead>
                        <tbody>
                            {receipts.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 500 }}>{r.customer.name}</td>
                                    <td style={{ fontSize: '13px' }}>{r.items.map(i => `${i.service.name} x${i.qty}`).join(', ')}</td>
                                    <td style={{ fontWeight: 600 }}>{r.total.toLocaleString('vi-VN')}₫</td>
                                    <td style={{ color: 'var(--success)' }}>{r.paid.toLocaleString('vi-VN')}₫</td>
                                    <td style={{ color: r.remaining > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.remaining.toLocaleString('vi-VN')}₫</td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
