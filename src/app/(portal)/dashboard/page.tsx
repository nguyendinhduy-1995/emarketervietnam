'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface DashboardData {
    subscription: {
        planKey: string;
        status: string;
        currentPeriodEnd: string | null;
    } | null;
    entitlements: Array<{ moduleKey: string; status: string }>;
    instance: {
        status: string;
        baseUrl: string;
    } | null;
    workspace: {
        slug: string;
        name: string;
    } | null;
}

function getStatusBadge(status: string) {
    const map: Record<string, string> = {
        ACTIVE: 'badge-success', FREE: 'badge-info', TRIAL: 'badge-info',
        PAID: 'badge-success', PAST_DUE: 'badge-warning', SUSPENDED: 'badge-danger',
        PENDING: 'badge-warning', FAILED: 'badge-danger',
    };
    return map[status] || 'badge-neutral';
}

function getCountdown(dateStr: string | null): string {
    if (!dateStr) return 'Không giới hạn';
    const diff = new Date(dateStr).getTime() - Date.now();
    if (diff <= 0) return 'Đã hết hạn';
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} ngày`;
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/subscription').then((r) => r.json()),
            fetch('/api/apps').then((r) => r.json()),
            fetch('/api/auth/me').then((r) => r.json()),
        ]).then(([subData, appData, meData]) => {
            const ws = meData.workspaces?.[0];
            setData({
                subscription: subData.subscription,
                entitlements: subData.entitlements || [],
                instance: appData.instances?.[0] || null,
                workspace: ws ? { slug: ws.slug, name: ws.name } : null,
            });
        });
    }, []);

    if (!data) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;
    }

    const sub = data.subscription;
    const planStatus = sub?.status || 'FREE';

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Tổng quan về Spa CRM của bạn</p>
            </div>

            {/* Status cards */}
            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-label">Gói hiện tại</div>
                    <div className="stat-value">
                        <span className={`badge ${getStatusBadge(planStatus)}`} style={{ fontSize: '16px' }}>
                            {sub?.planKey || 'FREE'}
                        </span>
                    </div>
                    <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Trạng thái: <span className={`badge ${getStatusBadge(planStatus)}`}>{planStatus}</span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Thời hạn còn lại</div>
                    <div className="stat-value" style={{ fontSize: '24px' }}>
                        {getCountdown(sub?.currentPeriodEnd || null)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Module đang bật</div>
                    <div className="stat-value">
                        {data.entitlements.filter((e) => e.status === 'ACTIVE').length}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">CRM Status</div>
                    <div className="stat-value">
                        <span className={`badge ${getStatusBadge(data.instance?.status || 'PENDING')}`}>
                            {data.instance?.status || 'PENDING'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick actions */}
            <div className="grid grid-2" style={{ marginBottom: '32px' }}>
                {data.instance?.status === 'ACTIVE' && data.workspace && (
                    <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>💆</div>
                        <h3 style={{ marginBottom: '8px' }}>Mở Spa CRM</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                            Truy cập CRM để quản lý khách hàng, lịch hẹn và doanh thu
                        </p>
                        <a href={process.env.NODE_ENV === 'production' ? `https://crmspa.emarketervietnam.vn/${data.workspace.slug}` : `http://crmspa.localhost:3000/${data.workspace.slug}`} className="btn btn-primary">
                            🚀 Truy cập CRM →
                        </a>
                    </div>
                )}

                <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
                    <h3 style={{ marginBottom: '8px' }}>Marketplace</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '14px' }}>
                        Khám phá và kích hoạt module mở rộng cho CRM
                    </p>
                    <Link href="/marketplace" className="btn btn-secondary">
                        Xem Module →
                    </Link>
                </div>
            </div>

            {/* Active Entitlements */}
            {data.entitlements.length > 0 && (
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Module đang hoạt động</h2>
                    <div className="grid grid-3">
                        {data.entitlements.filter((e) => e.status === 'ACTIVE').map((e) => (
                            <div key={e.moduleKey} className="card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className="badge badge-success">ACTIVE</span>
                                <span style={{ fontWeight: 500 }}>{e.moduleKey}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
