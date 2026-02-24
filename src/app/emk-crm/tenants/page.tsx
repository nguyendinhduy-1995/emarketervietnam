'use client';
import { useEffect, useState } from 'react';

interface Workspace {
    id: string; name: string; slug: string; product: string; status: string;
    _count: { memberships: number; subscriptions: number; entitlements: number };
}
interface Org {
    id: string; name: string; status: string; createdAt: string;
    owner: { id: string; name: string; email: string | null; phone: string | null } | null;
    workspaces: Workspace[];
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE: { label: 'Hoạt động', color: '#059669', bg: '#d1fae5' },
    SUSPENDED: { label: 'Tạm ngưng', color: '#dc2626', bg: '#fee2e2' },
    CANCELED: { label: 'Đã huỷ', color: '#6b7280', bg: '#f3f4f6' },
};

export default function TenantsPage() {
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const load = async () => {
        const res = await fetch('/api/emk-crm/tenants');
        if (res.ok) setOrgs(await res.json());
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const changeStatus = async (orgId: string, status: string) => {
        const reason = status === 'SUSPENDED' ? prompt('Lý do tạm ngưng:') : undefined;
        if (status === 'SUSPENDED' && !reason) return;
        setActionLoading(orgId);
        await fetch('/api/emk-crm/tenants', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orgId, status, reason }),
        });
        await load();
        setActionLoading(null);
    };

    const stats = {
        total: orgs.length,
        active: orgs.filter(o => o.status === 'ACTIVE').length,
        suspended: orgs.filter(o => o.status === 'SUSPENDED').length,
    };

    return (
        <div style={{ padding: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>🏢 Quản lý Tenant</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                {stats.total} tổ chức · {stats.active} hoạt động · {stats.suspended} tạm ngưng
            </p>

            {loading && <div className="emk-skeleton" style={{ height: '200px', borderRadius: '12px' }} />}

            {!loading && orgs.length === 0 && (
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px' }}>🏢</p>
                    <p style={{ fontWeight: 600 }}>Chưa có tenant nào</p>
                </div>
            )}

            {!loading && orgs.map(org => {
                const ss = STATUS_STYLE[org.status] || STATUS_STYLE.ACTIVE;
                const isExpanded = expandedId === org.id;

                return (
                    <div key={org.id} className="card" style={{
                        padding: '12px', marginBottom: '8px',
                        borderLeft: `4px solid ${ss.color}`,
                        opacity: actionLoading === org.id ? 0.6 : 1,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                            onClick={() => setExpandedId(isExpanded ? null : org.id)}>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <strong style={{ fontSize: '14px' }}>{org.name}</strong>
                                    <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: ss.bg, color: ss.color }}>{ss.label}</span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{org.workspaces.length} WS</span>
                                </div>
                                {org.owner && (
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        👤 {org.owner.name} · {org.owner.phone || org.owner.email}
                                    </div>
                                )}
                            </div>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▼</span>
                        </div>

                        {isExpanded && (
                            <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                                {/* Workspaces */}
                                {org.workspaces.map(ws => (
                                    <div key={ws.id} style={{ padding: '8px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '6px', fontSize: '11px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                            <strong>{ws.name}</strong>
                                            <code style={{ fontSize: '9px', background: 'var(--bg-card)', padding: '1px 4px', borderRadius: '3px' }}>{ws.slug}</code>
                                            <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', background: '#e0e7ff', color: '#3730a3', fontWeight: 600 }}>{ws.product}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', color: 'var(--text-muted)', fontSize: '10px' }}>
                                            <span>👥 {ws._count.memberships} members</span>
                                            <span>📋 {ws._count.subscriptions} subs</span>
                                            <span>🔑 {ws._count.entitlements} entitlements</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Actions */}
                                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    {org.status !== 'ACTIVE' && (
                                        <button onClick={() => changeStatus(org.id, 'ACTIVE')} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#d1fae5', color: '#065f46', border: 'none', cursor: 'pointer' }}>✅ Kích hoạt</button>
                                    )}
                                    {org.status === 'ACTIVE' && (
                                        <button onClick={() => changeStatus(org.id, 'SUSPENDED')} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>⛔ Tạm ngưng</button>
                                    )}
                                    {org.status !== 'CANCELED' && (
                                        <button onClick={() => { if (confirm('Huỷ tenant vĩnh viễn?')) changeStatus(org.id, 'CANCELED'); }} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#f3f4f6', color: '#6b7280', border: 'none', cursor: 'pointer' }}>🗑 Huỷ</button>
                                    )}
                                </div>

                                <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '8px' }}>
                                    Tạo: {new Date(org.createdAt).toLocaleDateString('vi-VN')} · ID: {org.id.slice(0, 12)}...
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
