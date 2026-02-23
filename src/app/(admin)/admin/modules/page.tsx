'use client';
import { useEffect, useState } from 'react';

interface Module { id: string; key: string; name: string; description: string | null; priceMonthly: number; icon: string | null; isActive: boolean; }

export default function AdminModulesPage() {
    const [modules, setModules] = useState<Module[]>([]);
    const [form, setForm] = useState({ key: '', name: '', description: '', priceMonthly: 0, icon: '', isActive: true });
    const [msg, setMsg] = useState('');

    const loadModules = () => {
        fetch('/api/admin/modules').then(r => r.json()).then(d => setModules(d.modules || []));
    };

    useEffect(() => { loadModules(); }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/modules', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
        });
        const data = await res.json();
        if (res.ok) { setMsg(`Module "${form.name}" saved`); loadModules(); }
        else setMsg(data.error);
    };

    return (
        <div>
            <div className="page-header">
                <h1>📦 Modules Ops</h1>
                <p>Quản lý module marketplace & giá</p>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}
            <form onSubmit={handleSave} className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Thêm / Cập nhật Module</h3>
                <div className="grid grid-3" style={{ marginBottom: '16px' }}>
                    <div className="form-group"><label className="form-label">Key</label><input className="form-input" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Tên</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                    <div className="form-group"><label className="form-label">Giá/tháng (VND)</label><input className="form-input" type="number" value={form.priceMonthly} onChange={e => setForm({ ...form, priceMonthly: parseInt(e.target.value) })} /></div>
                </div>
                <div className="form-group"><label className="form-label">Mô tả</label><input className="form-input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div className="form-group" style={{ margin: 0 }}><label className="form-label">Icon</label><input className="form-input" value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })} placeholder="💬" style={{ width: '80px' }} /></div>
                    <button type="submit" className="btn btn-primary btn-sm">Lưu Module</button>
                </div>
            </form>
            <div className="table-container">
                <table>
                    <thead><tr><th>Icon</th><th>Key</th><th>Tên</th><th>Giá/tháng</th><th>Active</th></tr></thead>
                    <tbody>
                        {modules.map(m => (
                            <tr key={m.id} onClick={() => setForm({ key: m.key, name: m.name, description: m.description || '', priceMonthly: m.priceMonthly, icon: m.icon || '', isActive: m.isActive })} style={{ cursor: 'pointer' }}>
                                <td>{m.icon}</td>
                                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{m.key}</td>
                                <td style={{ fontWeight: 500 }}>{m.name}</td>
                                <td style={{ fontWeight: 600 }}>{m.priceMonthly.toLocaleString('vi-VN')}₫</td>
                                <td><span className={`badge ${m.isActive ? 'badge-success' : 'badge-danger'}`}>{m.isActive ? 'Active' : 'Inactive'}</span></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
