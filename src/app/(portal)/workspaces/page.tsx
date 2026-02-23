'use client';
import { useEffect, useState } from 'react';

export default function WorkspacesPage() {
    const [workspaces, setWorkspaces] = useState<Array<{
        id: string; name: string; slug: string; product: string; status: string; role: string;
    }>>([]);

    useEffect(() => {
        fetch('/api/workspaces').then(r => r.json()).then(d => setWorkspaces(d.workspaces || []));
    }, []);

    return (
        <div>
            <div className="page-header">
                <h1>Workspaces</h1>
                <p>Quản lý các workspace của bạn</p>
            </div>
            <div className="grid grid-2">
                {workspaces.map(ws => (
                    <div key={ws.id} className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 600 }}>{ws.name}</h3>
                            <span className={`badge ${ws.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{ws.status}</span>
                        </div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
                            Slug: <code style={{ color: 'var(--accent-secondary)' }}>{ws.slug}</code>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>
                            Role: <span className="badge badge-info">{ws.role}</span>
                        </p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                            Link CRM: <a href={process.env.NODE_ENV === 'production' ? `https://crmspa.emarketervietnam.vn/${ws.slug}` : `http://crmspa.localhost:3000/${ws.slug}`} style={{ color: 'var(--accent-secondary)' }}>Mở CRM ({ws.slug})</a>
                        </p>
                    </div>
                ))}
            </div>
            {workspaces.length === 0 && (
                <div className="empty-state">
                    <div className="empty-icon">🏢</div>
                    <p>Chưa có workspace nào</p>
                </div>
            )}
        </div>
    );
}
