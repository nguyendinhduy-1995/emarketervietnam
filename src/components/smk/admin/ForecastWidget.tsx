'use client';

import { useState, useEffect } from 'react';

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

export default function ForecastWidget() {
    const [data, setData] = useState<{
        history: { date: string; revenue: number }[];
        totalRevenue: number; avgDaily: number;
        forecast: { prediction: string; trend: string; nextWeek: number[] };
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/smk/ai/forecast').then(r => r.json()).then(setData).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ height: 180, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
        </div>
    );
    if (!data) return null;

    const trendIcon = data.forecast.trend === 'up' ? '📈' : data.forecast.trend === 'down' ? '📉' : '➡️';
    const trendColor = data.forecast.trend === 'up' ? 'var(--success)' : data.forecast.trend === 'down' ? 'var(--error)' : 'var(--warning)';

    // Mini chart
    const allValues = [...data.history.slice(-7).map(d => d.revenue), ...data.forecast.nextWeek];
    const maxVal = Math.max(...allValues, 1);
    const chartWidth = 100; // percentage
    const barCount = allValues.length;

    return (
        <div className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    🤖 AI Dự đoán doanh thu
                    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 99, background: 'rgba(212,168,83,0.12)', color: 'var(--gold-400)', fontWeight: 500 }}>AI Powered</span>
                </h3>
                <span style={{ fontSize: 18 }}>{trendIcon}</span>
            </div>

            {/* Trend summary */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '8px 12px', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>TB/ngày (30d)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold-400)' }}>{formatVND(data.avgDaily)}</div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '8px 12px', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Xu hướng</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: trendColor }}>
                        {data.forecast.trend === 'up' ? '↑ Tăng' : data.forecast.trend === 'down' ? '↓ Giảm' : '→ Ổn định'}
                    </div>
                </div>
                <div style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '8px 12px', flex: '1 1 100px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Tuần tới (dự đoán)</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{formatVND(data.forecast.nextWeek.reduce((a, b) => a + b, 0))}</div>
                </div>
            </div>

            {/* Mini bar chart */}
            <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 80, marginBottom: 'var(--space-2)' }}>
                {allValues.map((v, i) => (
                    <div key={i} style={{
                        flex: 1, borderRadius: '3px 3px 0 0',
                        height: `${Math.max((v / maxVal) * 100, 4)}%`,
                        background: i < 7
                            ? 'rgba(212,168,83,0.3)'  // history
                            : 'linear-gradient(180deg, var(--gold-400), rgba(212,168,83,0.5))', // forecast
                        transition: 'height 0.5s ease',
                        opacity: i < 7 ? 0.6 : 1,
                    }} title={`${i < 7 ? 'Thực tế' : 'Dự đoán'}: ${formatVND(v)}`} />
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-muted)' }}>
                <span>← 7 ngày qua</span>
                <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>7 ngày tới →</span>
            </div>

            {/* AI prediction text */}
            <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: 'rgba(212,168,83,0.06)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                🤖 <strong>AI nhận xét:</strong> {data.forecast.prediction}
            </div>
        </div>
    );
}
