'use client';
import { useState, useEffect } from 'react';

interface UsageEvent {
    id: string;
    productId: string;
    meteredItemKey: string;
    quantity: number;
    unitPrice: number;
    total: number;
    status: string;
    createdAt: string;
    metadata: Record<string, unknown> | null;
}

interface QuotaInfo {
    itemKey: string;
    quotaUsed: number;
    quotaLimit: number;
    periodEnd: string;
}

export default function UsagePage() {
    const [events, setEvents] = useState<UsageEvent[]>([]);
    const [quotas, setQuotas] = useState<QuotaInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalSpent, setTotalSpent] = useState(0);

    useEffect(() => {
        Promise.all([
            fetch('/api/hub/usage/history').then(r => r.ok ? r.json() : { events: [], quotas: [] }).catch(() => ({ events: [], quotas: [] })),
        ]).then(([data]) => {
            setEvents(data.events || []);
            setQuotas(data.quotas || []);
            setTotalSpent((data.events || [])
                .filter((e: UsageEvent) => e.status === 'SUCCEEDED')
                .reduce((sum: number, e: UsageEvent) => sum + e.total, 0));
            setLoading(false);
        });
    }, []);

    const statusMap: Record<string, { icon: string; label: string; color: string }> = {
        PENDING: { icon: '⏳', label: 'Đang xử lý', color: '#f59e0b' },
        SUCCEEDED: { icon: '✅', label: 'Thành công', color: '#22c55e' },
        REVERSED: { icon: '↩️', label: 'Hoàn tiền', color: '#3b82f6' },
        FAILED: { icon: '❌', label: 'Thất bại', color: '#ef4444' },
    };

    const card: React.CSSProperties = {
        padding: '18px', borderRadius: '16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
    };
    const label: React.CSSProperties = {
        fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px',
    };

    if (loading) return (
        <div style={{ padding: '40px 0' }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="emk-skeleton" style={{ height: '72px', marginBottom: '12px' }} />
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>📊 Lịch sử sử dụng</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Theo dõi chi tiết PAYG và quota</p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ ...card, textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Tổng chi tiêu</div>
                    <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {totalSpent.toLocaleString()}đ
                    </div>
                </div>
                <div style={{ ...card, textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Lượt sử dụng</div>
                    <div style={{ fontSize: '22px', fontWeight: 800 }}>
                        {events.filter(e => e.status === 'SUCCEEDED').length}
                    </div>
                </div>
            </div>

            {/* Quotas */}
            {quotas.length > 0 && (
                <section>
                    <h2 style={label}>Quota hiện tại</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {quotas.map(q => {
                            const pct = q.quotaLimit > 0 ? Math.round(q.quotaUsed / q.quotaLimit * 100) : 0;
                            return (
                                <div key={q.itemKey} style={card}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontWeight: 600, fontSize: '14px' }}>{q.itemKey}</span>
                                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {q.quotaUsed}/{q.quotaLimit}
                                        </span>
                                    </div>
                                    <div style={{
                                        height: '6px', borderRadius: '3px',
                                        background: 'var(--bg-input)', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            height: '100%', borderRadius: '3px', width: `${Math.min(pct, 100)}%`,
                                            background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : 'var(--accent-primary)',
                                            transition: 'width 300ms ease',
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Usage Events */}
            <section>
                <h2 style={label}>Chi tiết giao dịch</h2>
                {events.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
                        Chưa có giao dịch PAYG nào
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {events.map(e => {
                            const s = statusMap[e.status] || statusMap.PENDING;
                            const diff = Date.now() - new Date(e.createdAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            const time = mins < 1 ? 'Vừa xong' : mins < 60 ? `${mins}p` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`;
                            return (
                                <div key={e.id} style={{
                                    ...card, display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                                }}>
                                    <span style={{ fontSize: '20px' }}>{s.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {e.meteredItemKey} ×{e.quantity}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            {s.label} · {time} trước
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: s.color }}>
                                            {e.status === 'REVERSED' ? '+' : '-'}{e.total.toLocaleString()}đ
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {e.unitPrice.toLocaleString()}đ/lượt
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
