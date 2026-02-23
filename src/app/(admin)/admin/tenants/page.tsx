'use client';
import { useEffect, useState } from 'react';

interface Tenant {
    id: string; name: string; slug: string; status: string; createdAt: string;
    org: { owner: { id: string; email: string; name: string; phone: string | null } };
    subscriptions: Array<{ planKey: string; status: string; currentPeriodEnd: string | null }>;
    productInstances: Array<{ status: string }>;
}

export default function AdminTenantsPage() {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [msg, setMsg] = useState('');

    const load = (s?: string) => {
        const q = s ? `?search=${encodeURIComponent(s)}` : '';
        fetch(`/api/admin/tenants${q}`).then(r => r.json()).then(d => { setTenants(d.workspaces || []); setTotal(d.total || 0); });
    };

    useEffect(() => { load(); }, []);

    const doAction = async (action: string, workspaceId: string, extra?: Record<string, unknown>) => {
        const res = await fetch('/api/admin/tenants', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, workspaceId, ...extra }),
        });
        const data = await res.json();
        setMsg(data.message || data.error);
        load(search);
    };

    return (
        <div>
            <div className="page-header">
                <h1>🏢 Tenants / Workspaces</h1>
                <p>Tổng: {total} workspace</p>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="search-bar">
                <span>🔍</span>
                <input placeholder="Tìm theo tên, email, SĐT, slug..." value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }} />
            </div>
            <div className="table-container">
                <table>
                    <thead><tr><th>Workspace</th><th>Slug</th><th>Owner</th><th>Plan</th><th>Status</th><th>CRM</th><th>Actions</th></tr></thead>
                    <tbody>
                        {tenants.map(t => (
                            <tr key={t.id}>
                                <td style={{ fontWeight: 500 }}>{t.name}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{t.slug}</td>
                                <td>
                                    <div style={{ fontSize: '13px' }}>{t.org.owner.name}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.org.owner.email}</div>
                                </td>
                                <td><span className="badge badge-info">{t.subscriptions[0]?.planKey || 'FREE'}</span></td>
                                <td><span className={`badge ${t.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{t.status}</span></td>
                                <td><span className={`badge ${t.productInstances[0]?.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>{t.productInstances[0]?.status || '—'}</span></td>
                                <td>
                                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {t.status === 'ACTIVE' ? (
                                            <button onClick={() => doAction('suspend', t.id)} className="btn btn-danger btn-sm">Suspend</button>
                                        ) : (
                                            <button onClick={() => doAction('unsuspend', t.id)} className="btn btn-secondary btn-sm">Unsuspend</button>
                                        )}
                                        <button onClick={() => doAction('extend_trial', t.id, { days: 14 })} className="btn btn-secondary btn-sm">+14d Trial</button>
                                        <button onClick={() => doAction('reset_password', t.id, { userId: t.org.owner.id })} className="btn btn-ghost btn-sm">Reset Pwd</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
