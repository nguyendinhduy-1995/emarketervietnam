'use client';
import { useEffect, useState } from 'react';

export default function AppsPage() {
    const [instances, setInstances] = useState<Array<{
        id: string; productKey: string; baseUrl: string; status: string; lastError: string | null; createdAt: string;
    }>>([]);
    const [jobs, setJobs] = useState<Array<{
        id: string; type: string; status: string; attempts: number; lastError: string | null; createdAt: string;
    }>>([]);

    useEffect(() => {
        fetch('/api/apps').then(r => r.json()).then(d => {
            setInstances(d.instances || []);
            setJobs(d.provisioningJobs || []);
        });
    }, []);

    const statusBadge = (s: string) => {
        const m: Record<string, string> = { ACTIVE: 'badge-success', PENDING: 'badge-warning', FAILED: 'badge-danger', DONE: 'badge-success', RUNNING: 'badge-info' };
        return m[s] || 'badge-neutral';
    };

    return (
        <div>
            <div className="page-header">
                <h1>Apps</h1>
                <p>Trạng thái các ứng dụng CRM của bạn</p>
            </div>

            {instances.map(inst => (
                <div key={inst.id} className="card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>🏥 {inst.productKey}</h3>
                            <a href={inst.baseUrl} style={{ color: 'var(--accent-secondary)', fontSize: '13px' }}>{inst.baseUrl}</a>
                        </div>
                        <span className={`badge ${statusBadge(inst.status)}`}>{inst.status}</span>
                    </div>
                    {inst.lastError && (
                        <div className="alert alert-danger" style={{ fontSize: '13px' }}>
                            Lỗi: {inst.lastError}
                        </div>
                    )}
                </div>
            ))}

            {jobs.length > 0 && (
                <>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, marginTop: '32px', marginBottom: '16px' }}>Log Provisioning</h2>
                    <div className="table-container">
                        <table>
                            <thead><tr><th>Type</th><th>Status</th><th>Attempts</th><th>Error</th><th>Created</th></tr></thead>
                            <tbody>
                                {jobs.map(j => (
                                    <tr key={j.id}>
                                        <td>{j.type}</td>
                                        <td><span className={`badge ${statusBadge(j.status)}`}>{j.status}</span></td>
                                        <td>{j.attempts}</td>
                                        <td style={{ color: 'var(--danger)', fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.lastError || '—'}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(j.createdAt).toLocaleString('vi-VN')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
