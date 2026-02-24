'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface WorkspaceInfo {
    id: string; name: string; slug: string; product: string; status: string;
    subscription?: { status: string; daysLeft: number; planKey: string };
    _count?: { leads?: number; tasks?: number; members?: number };
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: string }> = {
    TRIAL: { label: 'Mới bắt đầu', color: '#f59e0b', icon: '🆕' },
    ACTIVE: { label: 'Hoạt động', color: '#22c55e', icon: '✅' },
    PAST_DUE: { label: 'Cần gia hạn', color: '#ef4444', icon: '⚠️' },
    SUSPENDED: { label: 'Tạm dừng', color: '#6b7280', icon: '⏸' },
};

function getHealthScore(ws: WorkspaceInfo): { level: 'healthy' | 'warning' | 'critical'; label: string; color: string } {
    const subStatus = ws.subscription?.status || ws.status;
    if (subStatus === 'SUSPENDED' || subStatus === 'PAST_DUE') return { level: 'critical', label: 'Cần xử lý', color: '#ef4444' };
    if (subStatus === 'TRIAL' && (ws.subscription?.daysLeft || 30) < 5) return { level: 'warning', label: 'Sắp hết module', color: '#f59e0b' };
    return { level: 'healthy', label: 'Tốt', color: '#22c55e' };
}

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/workspaces').then(r => r.json()).then(d => {
            setWorkspaces(d.workspaces || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const totalActive = workspaces.filter(w => (w.subscription?.status || w.status) === 'ACTIVE').length;
    const totalTrial = workspaces.filter(w => (w.subscription?.status || w.status) === 'TRIAL').length;
    const totalAtRisk = workspaces.filter(w => ['PAST_DUE', 'SUSPENDED'].includes(w.subscription?.status || w.status)).length;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)',  }} />)}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🏢 Không gian làm việc</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {workspaces.length} không gian — quản lý và theo dõi sức khỏe
                </p>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                {[
                    { label: 'Tổng', value: workspaces.length, color: '#6366f1', icon: '🏢' },
                    { label: 'Hoạt động', value: totalActive, color: '#22c55e', icon: '✅' },
                    { label: 'Module đang dùng', value: totalTrial + totalActive, color: '#f59e0b', icon: '📦' },
                    { label: 'Nguy cơ', value: totalAtRisk, color: '#ef4444', icon: '⚠️' },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '12px', borderRadius: '14px', textAlign: 'center',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                        <div style={{ fontSize: '18px', marginBottom: '2px' }}>{s.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {workspaces.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 24px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏗️</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Chưa có không gian nào</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>Tạo không gian đầu tiên qua onboarding</p>
                    <Link href="/hub/onboarding" style={{
                        display: 'inline-block', padding: '10px 20px', borderRadius: '12px',
                        background: 'var(--accent-gradient)', color: 'white', fontWeight: 700,
                        textDecoration: 'none', fontSize: '14px',
                    }}>🚀 Bắt đầu</Link>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {workspaces.map(ws => {
                        const subStatus = ws.subscription?.status || ws.status;
                        const statusInfo = STATUS_LABELS[subStatus] || { label: subStatus, color: 'var(--text-muted)', icon: '❓' };
                        const health = getHealthScore(ws);
                        return (
                            <div key={ws.id} style={{
                                padding: '16px', borderRadius: '16px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                borderLeft: `3px solid ${health.color}`,
                            }}>
                                {/* Row 1: Name + Status */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {ws.name}
                                            <span style={{
                                                display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%',
                                                background: health.color,
                                            }} title={`Sức khỏe: ${health.label}`} />
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {ws.product} · {ws.slug}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                            background: `${statusInfo.color}15`, color: statusInfo.color,
                                        }}>{statusInfo.icon} {statusInfo.label}</span>
                                        <span style={{
                                            padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                                            background: `${health.color}15`, color: health.color,
                                        }}>{health.label}</span>
                                    </div>
                                </div>

                                {/* Row 2: Module renewal reminder */}
                                {subStatus === 'TRIAL' && ws.subscription && (
                                    <div style={{
                                        padding: '6px 10px', borderRadius: '8px', marginBottom: '8px',
                                        background: `${statusInfo.color}08`, fontSize: '12px', fontWeight: 600,
                                        color: ws.subscription.daysLeft < 5 ? '#ef4444' : statusInfo.color,
                                    }}>
                                        📦 Còn {ws.subscription.daysLeft} ngày sử dụng module
                                        {ws.subscription.daysLeft < 5 && ' — Nhắc gia hạn module!'}
                                    </div>
                                )}

                                {/* Row 3: Quick actions */}
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    <Link href="/emk-crm" style={{
                                        padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        background: '#6366f115', color: '#6366f1', textDecoration: 'none',
                                        border: '1px solid #6366f130',
                                    }}>📊 CRM</Link>
                                    <Link href="/hub/billing" style={{
                                        padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        background: '#22c55e15', color: '#22c55e', textDecoration: 'none',
                                        border: '1px solid #22c55e30',
                                    }}>💳 Thanh toán</Link>
                                    <Link href="/hub/settings" style={{
                                        padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        background: '#f59e0b15', color: '#f59e0b', textDecoration: 'none',
                                        border: '1px solid #f59e0b30',
                                    }}>⚙️ Cài đặt</Link>
                                    <Link href="/hub/support" style={{
                                        padding: '5px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                        background: '#8b5cf615', color: '#8b5cf6', textDecoration: 'none',
                                        border: '1px solid #8b5cf630',
                                    }}>🎫 Hỗ trợ</Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
