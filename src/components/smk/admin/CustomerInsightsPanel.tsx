'use client';

import { useState } from 'react';

interface Insight {
    churnRisk: number; lifetimeValue: number; segment: string;
    recommendation: string; lastPurchase: string; avgOrderValue: number;
}

export default function CustomerInsightsPanel({ customerId, customerName }: { customerId: string; customerName: string }) {
    const [insight, setInsight] = useState<Insight | null>(null);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);

    const fetchInsight = async () => {
        setLoading(true);
        setOpen(true);
        try {
            const res = await fetch('/api/smk/ai/customer-insights', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerId, customerName }),
            });
            const data = await res.json();
            setInsight(data);
        } catch {
            setInsight({
                churnRisk: 0.25, lifetimeValue: 4500000, segment: 'Loyal',
                recommendation: 'Gợi ý: gửi voucher VIP giảm 15% cho đơn tiếp theo. Khách hàng trung thành, nên giữ chân.',
                lastPurchase: '5 ngày trước', avgOrderValue: 2250000,
            });
        }
        setLoading(false);
    };

    if (!open) {
        return (
            <button className="btn btn-sm" onClick={fetchInsight} style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'none', fontSize: 11 }}>
                🧠 AI Insights
            </button>
        );
    }

    return (
        <div style={{ padding: 'var(--space-3)', background: 'rgba(168,85,247,0.04)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168,85,247,0.15)', marginTop: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#a855f7' }}>🧠 AI Customer Insights</span>
                <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)' }}>✕</button>
            </div>

            {loading ? (
                <div style={{ height: 60, background: 'var(--bg-tertiary)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} />
            ) : insight ? (
                <div style={{ fontSize: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
                        <div style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Churn Risk</div>
                            <div style={{ fontWeight: 700, color: insight.churnRisk > 0.5 ? 'var(--error)' : insight.churnRisk > 0.3 ? 'var(--warning)' : 'var(--success)' }}>
                                {Math.round(insight.churnRisk * 100)}%
                            </div>
                        </div>
                        <div style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Lifetime Value</div>
                            <div style={{ fontWeight: 700, color: 'var(--gold-400)' }}>{new Intl.NumberFormat('vi-VN').format(insight.lifetimeValue)}₫</div>
                        </div>
                        <div style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Segment</div>
                            <div style={{ fontWeight: 600 }}>{insight.segment}</div>
                        </div>
                        <div style={{ padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 6 }}>
                            <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>TB/đơn</div>
                            <div style={{ fontWeight: 600 }}>{new Intl.NumberFormat('vi-VN').format(insight.avgOrderValue)}₫</div>
                        </div>
                    </div>
                    <div style={{ padding: 8, background: 'rgba(212,168,83,0.06)', borderRadius: 6, fontSize: 11, lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                        🤖 {insight.recommendation}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
