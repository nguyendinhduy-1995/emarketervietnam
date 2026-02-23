'use client';
import { useEffect, useState } from 'react';

interface Member {
    user: { id: string; email: string; name: string; phone: string | null; status: string };
    role: string;
}

export default function UsersPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [showInvite, setShowInvite] = useState(false);
    const [form, setForm] = useState({ email: '', name: '', role: 'STAFF' });
    const [msg, setMsg] = useState('');

    useEffect(() => {
        fetch('/api/users').then(r => r.json()).then(d => setMembers(d.members || []));
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const data = await res.json();
        if (res.ok) { setMsg('Đã mời thành công!'); setShowInvite(false); setForm({ email: '', name: '', role: 'STAFF' }); }
        else setMsg(data.error);
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1>👥 Users & Roles</h1><p>Quản lý thành viên workspace</p></div>
                <button onClick={() => setShowInvite(!showInvite)} className="btn btn-primary btn-sm">+ Mời thành viên</button>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            {showInvite && (
                <form onSubmit={handleInvite} className="card" style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <input className="form-input" style={{ flex: 1, minWidth: '200px' }} placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        <input className="form-input" style={{ flex: 1, minWidth: '150px' }} placeholder="Tên" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                        <select className="form-input" style={{ width: '120px' }} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                            <option value="STAFF">Staff</option><option value="ADMIN">Admin</option>
                        </select>
                        <button type="submit" className="btn btn-primary btn-sm">Mời</button>
                    </div>
                </form>
            )}
            <div className="table-container">
                <table>
                    <thead><tr><th>Tên</th><th>Email</th><th>SĐT</th><th>Role</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                        {members.map(m => (
                            <tr key={m.user.id}>
                                <td style={{ fontWeight: 500 }}>{m.user.name}</td>
                                <td>{m.user.email}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{m.user.phone || '—'}</td>
                                <td><span className={`badge ${m.role === 'OWNER' ? 'badge-success' : 'badge-info'}`}>{m.role}</span></td>
                                <td><span className={`badge ${m.user.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>{m.user.status}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
