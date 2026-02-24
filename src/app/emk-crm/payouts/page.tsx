'use client';
import { useEffect, useState } from 'react';

interface PayoutBatch {
    id: string; month: string; total: number; status: string;
    items: Array<{ id: string; affiliateId: string; amount: number; status: string }>;
}

const STATUS_VN: Record<string, string> = { DRAFT: 'Bản nháp', APPROVED: 'Đã duyệt', PAID: 'Đã trả' };
const STATUS_COLORS: Record<string, string> = { DRAFT: '#f59e0b', APPROVED: '#3b82f6', PAID: '#22c55e' };

export default function PayoutsPage() {
    const [batches, setBatches] = useState<PayoutBatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetch('/api/emk-crm/payouts').then(r => r.json()).then(d => { setBatches(d.batches || []); setLoading(false); });
    }, []);

    const createBatch = async () => {
        setCreating(true);
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        const res = await fetch('/api/emk-crm/payouts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month }),
        });
        const data = await res.json();
        if (data.batch) setBatches(prev => [data.batch, ...prev]);
        setCreating(false);
    };

    const formatMonth = (m: string) => {
        const [y, mo] = m.split('-');
        return `Tháng ${parseInt(mo)}/${y}`;
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2].map(i => <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)',  }} />)}
        </div>
    );

    const totalPaid = batches.filter(b => b.status === 'PAID').reduce((s, b) => s + b.total, 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Chi trả hoa hồng</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                        {batches.length > 0
                            ? `${batches.length} đợt · Đã trả ${totalPaid.toLocaleString('vi-VN')}₫`
                            : 'Tạo đợt chi trả cho đại lý'}
                    </p>
                </div>
                <button onClick={createBatch} disabled={creating} style={{
                    padding: '8px 16px', borderRadius: '10px',
                    background: 'var(--accent-primary)', border: 'none', color: 'white',
                    fontWeight: 600, fontSize: '13px', cursor: creating ? 'wait' : 'pointer',
                    fontFamily: 'inherit', opacity: creating ? 0.7 : 1,
                }}>
                    {creating ? 'Đang tạo...' : '+ Tạo đợt mới'}
                </button>
            </div>

            {batches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>💰</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Chưa có đợt chi trả nào</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                        Nhấn &quot;Tạo đợt mới&quot; để tạo batch chi trả từ hoa hồng đã duyệt
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {batches.map(b => {
                        const statusColor = STATUS_COLORS[b.status] || '#6b7280';
                        return (
                            <div key={b.id} style={{
                                padding: '16px', borderRadius: '14px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '15px' }}>📅 {formatMonth(b.month)}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {b.items.length} {b.items.length === 1 ? 'đại lý' : 'đại lý'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{b.total.toLocaleString('vi-VN')}₫</div>
                                        <span style={{
                                            fontSize: '11px', fontWeight: 700,
                                            color: statusColor,
                                            padding: '2px 8px', borderRadius: '6px',
                                            background: `${statusColor}12`,
                                        }}>
                                            {STATUS_VN[b.status] || b.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
