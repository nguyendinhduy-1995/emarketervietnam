'use client';
import { useEffect, useState } from 'react';

interface AuditLog {
    id: string; actorUserId: string; actorName: string | null;
    action: string; resource: string; resourceId: string | null;
    workspaceId: string | null; before: Record<string, unknown> | null; after: Record<string, unknown> | null;
    reason: string | null; ip: string | null; createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
    TENANT_PROVISIONED: '#6366f1', TENANT_SUSPENDED: '#ef4444', TENANT_ACTIVE: '#10b981',
    ENTITLEMENT_GRANTED: '#10b981', ENTITLEMENT_REVOKED: '#ef4444',
};

export default function AuditLogsPage() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [filter, setFilter] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const loadLogs = async (p: number, action?: string) => {
        setLoading(true);
        const params = new URLSearchParams({ page: String(p), limit: '30' });
        if (action) params.set('action', action);
        const res = await fetch(`/api/emk-crm/audit-logs?${params}`);
        if (res.ok) {
            const data = await res.json();
            setLogs(data.logs); setTotal(data.pagination.total);
        }
        setLoading(false);
    };

    useEffect(() => { loadLogs(page, filter || undefined); }, [page, filter]);

    return (
        <div style={{ padding: '16px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>🔍 Nhật ký Admin</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Audit trail — {total} bản ghi
            </p>

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {['', 'TENANT_PROVISIONED', 'TENANT_SUSPENDED', 'ENTITLEMENT_GRANTED', 'ENTITLEMENT_REVOKED'].map(a => (
                    <button key={a} onClick={() => { setFilter(a); setPage(1); }} style={{
                        padding: '5px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600,
                        border: '1px solid', cursor: 'pointer',
                        borderColor: filter === a ? 'var(--accent-primary)' : 'var(--border)',
                        background: filter === a ? 'var(--accent-primary)' : 'transparent',
                        color: filter === a ? '#fff' : 'var(--text-secondary)',
                    }}>{a || 'Tất cả'}</button>
                ))}
            </div>

            {loading && <div className="emk-skeleton" style={{ height: '200px', borderRadius: '12px' }} />}

            {!loading && logs.length === 0 && (
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ fontSize: '32px' }}>📋</p>
                    <p style={{ fontWeight: 600 }}>Chưa có nhật ký</p>
                </div>
            )}

            {!loading && logs.map(log => (
                <div key={log.id} className="card" style={{
                    padding: '10px 12px', marginBottom: '6px', cursor: 'pointer',
                    borderLeft: `3px solid ${ACTION_COLORS[log.action] || '#6b7280'}`,
                }} onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '12px' }}>{log.actorName || log.actorUserId}</strong>
                                <span style={{
                                    fontSize: '9px', padding: '1px 6px', borderRadius: '4px', fontWeight: 700,
                                    background: ACTION_COLORS[log.action] || '#6b7280', color: '#fff',
                                }}>{log.action}</span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {log.resource} {log.resourceId && `/ ${log.resourceId.slice(0, 8)}`}
                                {log.reason && ` — "${log.reason}"`}
                            </div>
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', minWidth: '60px' }}>
                            {new Date(log.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    {expandedId === log.id && (
                        <div style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', background: 'var(--bg-hover)', fontSize: '10px' }}>
                            {log.ip && <div><strong>IP:</strong> {log.ip}</div>}
                            {log.workspaceId && <div><strong>Workspace:</strong> {log.workspaceId}</div>}
                            {log.before && <div style={{ marginTop: '4px' }}><strong>Before:</strong> <pre style={{ fontSize: '9px', whiteSpace: 'pre-wrap', margin: '2px 0' }}>{JSON.stringify(log.before, null, 2)}</pre></div>}
                            {log.after && <div style={{ marginTop: '4px' }}><strong>After:</strong> <pre style={{ fontSize: '9px', whiteSpace: 'pre-wrap', margin: '2px 0' }}>{JSON.stringify(log.after, null, 2)}</pre></div>}
                        </div>
                    )}
                </div>
            ))}

            {/* Pagination */}
            {total > 30 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                    <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                        style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>← Trước</button>
                    <span style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--text-muted)' }}>Trang {page} / {Math.ceil(total / 30)}</span>
                    <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(page + 1)}
                        style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: page >= Math.ceil(total / 30) ? 'default' : 'pointer', opacity: page >= Math.ceil(total / 30) ? 0.5 : 1 }}>Sau →</button>
                </div>
            )}
        </div>
    );
}
