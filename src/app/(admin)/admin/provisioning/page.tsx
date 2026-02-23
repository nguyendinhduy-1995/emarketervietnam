'use client';
import { useState } from 'react';

export default function AdminProvisioningPage() {
    const [msg, setMsg] = useState('');

    const handleRetry = async (e: React.FormEvent) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget as HTMLFormElement);
        const workspaceId = formData.get('workspaceId') as string;
        const res = await fetch(`/api/admin/provisioning/${workspaceId}/retry`, { method: 'POST' });
        const data = await res.json();
        setMsg(data.message || data.error);
    };

    return (
        <div>
            <div className="page-header">
                <h1>⚙️ Provisioning Ops</h1>
                <p>Log tạo workspace và retry provisioning thất bại</p>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>Retry Provisioning</h3>
                <form onSubmit={handleRetry} style={{ display: 'flex', gap: '12px' }}>
                    <input name="workspaceId" className="form-input" placeholder="Workspace ID" required style={{ flex: 1 }} />
                    <button type="submit" className="btn btn-primary btn-sm">🔄 Retry</button>
                </form>
            </div>
        </div>
    );
}
