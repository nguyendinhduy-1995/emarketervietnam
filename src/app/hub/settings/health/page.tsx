'use client';
import { useEffect, useState } from 'react';

interface HealthCheck {
    ok: boolean;
    detail?: string;
}

export default function HealthPage() {
    const [checks, setChecks] = useState<Record<string, HealthCheck>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hub/health')
            .then(r => r.json())
            .then(d => { setChecks(d.checks || {}); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const items = [
        { key: 'db', label: 'Cơ sở dữ liệu', icon: '🗄️' },
        { key: 'redis', label: 'Hàng đợi (Redis)', icon: '⚡' },
        { key: 'lastError', label: 'Lỗi gần nhất', icon: '❌' },
        { key: 'lastImport', label: 'Nhập dữ liệu gần nhất', icon: '📥' },
        { key: 'lastLogin', label: 'Đăng nhập gần nhất', icon: '🔑' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Tình trạng hệ thống</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Kiểm tra nhanh sức khỏe nền tảng</p>
            </div>

            {loading ? (
                items.map((_, i) => (
                    <div key={i} className="emk-skeleton" style={{ height: '64px' }} />
                ))
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {items.map(item => {
                        const check = checks[item.key];
                        return (
                            <div key={item.key} style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '16px', borderRadius: '16px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <span style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {check?.detail || '—'}
                                    </div>
                                </div>
                                <span style={{
                                    width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                                    background: check?.ok ? 'var(--success)' : 'var(--danger)',
                                    boxShadow: check?.ok ? '0 0 6px rgba(34,197,94,0.5)' : '0 0 6px rgba(239,68,68,0.5)',
                                }} />
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
