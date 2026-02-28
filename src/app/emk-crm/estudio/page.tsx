'use client';

import { useState, useEffect } from 'react';

interface InstanceInfo {
    id: string;
    domain: string;
    status: string;
    crmUrl: string | null;
    createdAt: string;
}

interface UsageStat {
    label: string;
    value: string;
    icon: string;
    change: string;
}

export default function EstudioAdminPage() {
    const [instances, setInstances] = useState<InstanceInfo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch eStudio instances from Hub
        fetch('/api/emk-crm/estudio/instances')
            .then(r => r.ok ? r.json() : { instances: [] })
            .then(d => setInstances(d.instances || []))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const stats: UsageStat[] = [
        { label: 'Instances', value: String(instances.length), icon: '🎬', change: 'Active' },
        { label: 'Total Users', value: '—', icon: '👥', change: 'All instances' },
        { label: 'Scripts/Tháng', value: '—', icon: '📝', change: 'Tổng' },
        { label: 'Doanh thu', value: '—', icon: '💰', change: 'Tháng này' },
    ];

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎬 eStudio Manager
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                    Quản lý instances eStudio đang hoạt động trên hệ thống
                </p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {stats.map(s => (
                    <div key={s.label} style={{
                        padding: '16px', borderRadius: '14px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '24px' }}>{s.icon}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '8px', background: 'var(--bg-primary)' }}>{s.change}</span>
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 800, marginBottom: '2px' }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Instances Table */}
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '14px', overflow: 'hidden',
            }}>
                <div style={{
                    padding: '14px 20px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 700 }}>Instances</h2>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{instances.length} total</span>
                </div>

                {loading ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                        Đang tải...
                    </div>
                ) : instances.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '8px' }}>📭</div>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Chưa có instance nào. Khi khách hàng mua eStudio qua Hub, instances sẽ hiển thị tại đây.
                        </p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
                                <th style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Domain</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Ngày tạo</th>
                                <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {instances.map(inst => (
                                <tr key={inst.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '12px 20px' }}>
                                        <div style={{ fontWeight: 600 }}>{inst.domain}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{inst.id}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                            background: inst.status === 'ACTIVE' ? '#10b98115' : inst.status === 'DEPLOYING' ? '#f59e0b15' : '#ef444415',
                                            color: inst.status === 'ACTIVE' ? '#10b981' : inst.status === 'DEPLOYING' ? '#f59e0b' : '#ef4444',
                                        }}>{inst.status}</span>
                                    </td>
                                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                                        {new Date(inst.createdAt).toLocaleDateString('vi-VN')}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        {inst.crmUrl && (
                                            <a href={inst.crmUrl} target="_blank" rel="noopener noreferrer"
                                                style={{
                                                    padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                                    textDecoration: 'none', background: 'var(--accent-primary)', color: 'white',
                                                }}>Mở ↗</a>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
