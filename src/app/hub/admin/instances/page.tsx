'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';
import { vnd } from '@/lib/format';

interface Instance {
    id: string; workspaceId: string; domain: string;
    status: string; crmUrl: string | null;
    adminUserId: string | null; deployedAt: string | null;
    createdAt: string;
    deployLog: Record<string, unknown> | null;
    _workspace?: { name: string; org?: { name: string } };
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE: { bg: '#dcfce7', color: '#166534', label: 'Hoạt động' },
    PENDING: { bg: '#fef3c7', color: '#92400e', label: 'Chờ triển khai' },
    DEPLOYING: { bg: '#dbeafe', color: '#1e40af', label: 'Đang triển khai' },
    SUSPENDED: { bg: '#fee2e2', color: '#991b1b', label: 'Tạm ngưng' },
    DELETED: { bg: '#f3f4f6', color: '#6b7280', label: 'Đã xóa' },
};

export default function AdminInstancesPage() {
    const [instances, setInstances] = useState<Instance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const loadInstances = useCallback(async () => {
        try {
            const r = await fetch('/api/hub/admin/instances');
            const d = await r.json();
            setInstances(d.instances || []);
        } catch { toastError('Lỗi tải danh sách'); }
        setLoading(false);
    }, [toastError]);

    useEffect(() => { loadInstances(); }, [loadInstances]);

    const handleAction = async (workspaceId: string, action: 'SUSPEND' | 'REACTIVATE') => {
        const reason = prompt(action === 'SUSPEND' ? 'Lý do tạm ngưng:' : 'Lý do kích hoạt lại:');
        if (!reason || reason.length < 5) { toastError('Lý do phải ≥ 5 ký tự'); return; }

        setActionLoading(workspaceId);
        try {
            const r = await fetch('/api/hub/admin/suspend-instance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workspaceId, action, reason }),
            });
            const d = await r.json();
            if (d.ok) { success(`${action === 'SUSPEND' ? 'Đã tạm ngưng' : 'Đã kích hoạt'} thành công`); loadInstances(); }
            else toastError(d.error || 'Lỗi');
        } catch { toastError('Lỗi kết nối'); }
        setActionLoading(null);
    };

    const filtered = instances.filter(i => filter === 'ALL' || i.status === filter);

    const stats = {
        total: instances.length,
        active: instances.filter(i => i.status === 'ACTIVE').length,
        suspended: instances.filter(i => i.status === 'SUSPENDED').length,
        deploying: instances.filter(i => ['PENDING', 'DEPLOYING'].includes(i.status)).length,
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => <div key={i} className="emk-skeleton" style={{ height: '80px', borderRadius: '16px' }} />)}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 4px' }}>🏢 CRM Instances</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Quản lý tất cả CRM đã triển khai</p>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {[
                    { label: 'Tổng', value: stats.total, color: 'var(--text-primary)' },
                    { label: 'Hoạt động', value: stats.active, color: '#22c55e' },
                    { label: 'Tạm ngưng', value: stats.suspended, color: '#ef4444' },
                    { label: 'Đang triển khai', value: stats.deploying, color: '#6366f1' },
                ].map(s => (
                    <div key={s.label} style={{
                        padding: '12px', borderRadius: '12px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Filter */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
                {['ALL', 'ACTIVE', 'SUSPENDED', 'PENDING', 'DEPLOYING'].map(f => (
                    <button key={f} onClick={() => setFilter(f)} style={{
                        padding: '6px 14px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                        background: filter === f ? 'var(--accent-primary)' : 'var(--bg-card)',
                        color: filter === f ? 'white' : 'var(--text-secondary)',
                        border: filter === f ? 'none' : '1px solid var(--border)',
                        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}>
                        {f === 'ALL' ? `Tất cả (${stats.total})` :
                            `${(STATUS_STYLE[f]?.label || f)} (${instances.filter(i => i.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* Instance list */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                    Không có instance nào
                </div>
            ) : filtered.map(inst => {
                const st = STATUS_STYLE[inst.status] || STATUS_STYLE.PENDING;
                return (
                    <div key={inst.id} style={{
                        padding: '14px', borderRadius: '14px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px',
                    }}>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '20px' }}>🏢</span>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{inst.domain}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                        WS: {inst.workspaceId.slice(0, 8)}...
                                    </div>
                                </div>
                            </div>
                            <span style={{
                                padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                                background: st.bg, color: st.color,
                            }}>
                                {st.label}
                            </span>
                        </div>

                        {/* Meta */}
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            {inst.deployedAt && <span>📅 {new Date(inst.deployedAt).toLocaleDateString('vi-VN')}</span>}
                            {inst.crmUrl && <a href={inst.crmUrl} target="_blank" rel="noopener" style={{ color: 'var(--accent-primary)' }}>🔗 Mở CRM</a>}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {inst.status === 'ACTIVE' && (
                                <button onClick={() => handleAction(inst.workspaceId, 'SUSPEND')}
                                    disabled={actionLoading === inst.workspaceId}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                        background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer',
                                        fontFamily: 'inherit', opacity: actionLoading === inst.workspaceId ? 0.5 : 1,
                                    }}>
                                    ⏸ Tạm ngưng
                                </button>
                            )}
                            {inst.status === 'SUSPENDED' && (
                                <button onClick={() => handleAction(inst.workspaceId, 'REACTIVATE')}
                                    disabled={actionLoading === inst.workspaceId}
                                    style={{
                                        padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                        background: '#dcfce7', color: '#166534', border: 'none', cursor: 'pointer',
                                        fontFamily: 'inherit', opacity: actionLoading === inst.workspaceId ? 0.5 : 1,
                                    }}>
                                    ▶️ Kích hoạt
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
