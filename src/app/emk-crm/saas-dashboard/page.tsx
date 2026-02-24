'use client';
import { useEffect, useState } from 'react';

interface SaaSMetrics {
    subscriptions: { total: number; active: number; trial: number; suspended: number; newLast30d: number; prevNewLast30d: number };
    churn: { canceled30d: number; rate: number };
    mrr: number;
    revenue30d: number;
    tenants: { orgs: number; activeOrgs: number; workspaces: number };
    walletBalance: number;
    entitlements: number;
}

function vnd(n: number) { return new Intl.NumberFormat('vi-VN').format(n) + 'đ'; }

export default function SaasDashPage() {
    const [data, setData] = useState<SaaSMetrics | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/emk-crm/analytics/saas')
            .then(r => r.json()).then(d => { setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="emk-skeleton" style={{ height: '300px', borderRadius: '16px' }} />;
    if (!data) return <div className="card" style={{ padding: '40px', textAlign: 'center' }}>Không load được dữ liệu</div>;

    const trend = data.subscriptions.newLast30d - data.subscriptions.prevNewLast30d;
    const trendIcon = trend > 0 ? '📈' : trend < 0 ? '📉' : '→';

    return (
        <div style={{ padding: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>📊 SaaS Dashboard</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Tổng quan kinh doanh SaaS — Cập nhật real-time</p>

            {/* KPI Cards — 2x2 grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
                <KpiCard title="MRR" value={vnd(data.mrr)} icon="💰" color="#6366f1" />
                <KpiCard title="Doanh thu 30 ngày" value={vnd(data.revenue30d)} icon="📊" color="#10b981" />
                <KpiCard title="Churn Rate" value={`${data.churn.rate}%`} icon="🔻" color={data.churn.rate > 5 ? '#ef4444' : '#10b981'} sub={`${data.churn.canceled30d} hủy / 30d`} />
                <KpiCard title="Ví tổng" value={vnd(data.walletBalance)} icon="🏦" color="#f59e0b" />
            </div>

            {/* Subscriptions */}
            <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>📋 Subscriptions</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                    <StatBlock label="Tổng" value={data.subscriptions.total} />
                    <StatBlock label="Active" value={data.subscriptions.active} color="#10b981" />
                    <StatBlock label="Trial" value={data.subscriptions.trial} color="#6366f1" />
                    <StatBlock label="Suspended" value={data.subscriptions.suspended} color="#ef4444" />
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    Mới 30d: <strong>{data.subscriptions.newLast30d}</strong> {trendIcon} (trước: {data.subscriptions.prevNewLast30d})
                    {trend !== 0 && <span style={{ color: trend > 0 ? '#10b981' : '#ef4444', fontWeight: 700 }}> {trend > 0 ? '+' : ''}{trend}</span>}
                </div>
            </div>

            {/* Tenants */}
            <div className="card" style={{ padding: '14px', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '10px' }}>🏢 Tenants</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <StatBlock label="Tổng Org" value={data.tenants.orgs} />
                    <StatBlock label="Active" value={data.tenants.activeOrgs} color="#10b981" />
                    <StatBlock label="Workspaces" value={data.tenants.workspaces} color="#6366f1" />
                </div>
            </div>

            {/* Entitlements */}
            <div className="card" style={{ padding: '14px' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>🔑 Entitlements</h3>
                <p style={{ fontSize: '22px', fontWeight: 800 }}>{data.entitlements} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>active</span></p>
            </div>
        </div>
    );
}

function KpiCard({ title, value, icon, color, sub }: { title: string; value: string; icon: string; color: string; sub?: string }) {
    return (
        <div className="card" style={{ padding: '14px', borderLeft: `4px solid ${color}` }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>{icon} {title}</div>
            <div style={{ fontSize: '18px', fontWeight: 800, color }}>{value}</div>
            {sub && <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>{sub}</div>}
        </div>
    );
}

function StatBlock({ label, value, color }: { label: string; value: number; color?: string }) {
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: color || 'var(--text-primary)' }}>{value}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        </div>
    );
}
