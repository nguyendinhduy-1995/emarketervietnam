'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Customer { id: string; name: string; phone: string | null; email: string | null; createdAt: string; }

export default function CrmCustomersPage() {
    const { spaSlug } = useParams();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [search, setSearch] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', email: '', notes: '' });
    const [msg, setMsg] = useState('');

    const load = (s?: string) => {
        const q = s ? `?search=${encodeURIComponent(s)}` : '';
        fetch(`/api/crm/${spaSlug}/customers${q}`).then(r => r.json()).then(d => setCustomers(d.customers || []));
    };

    useEffect(() => { load(); }, [spaSlug]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/crm/${spaSlug}/customers`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        if (res.ok) { setMsg('Đã thêm khách hàng!'); setShowAdd(false); setForm({ name: '', phone: '', email: '', notes: '' }); load(); }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1>👥 Khách hàng</h1><p>Quản lý danh sách khách hàng Spa</p></div>
                <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm">+ Thêm khách</button>
            </div>
            {msg && <div className="alert alert-success">{msg}</div>}

            {showAdd && (
                <form onSubmit={handleAdd} className="card" style={{ marginBottom: '20px' }}>
                    <div className="grid grid-3">
                        <div className="form-group"><label className="form-label">Tên *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">SĐT</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                        <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">Lưu khách hàng</button>
                </form>
            )}

            <div className="search-bar"><span>🔍</span><input placeholder="Tìm theo tên, SĐT..." value={search} onChange={e => { setSearch(e.target.value); load(e.target.value); }} /></div>

            <div className="table-container">
                <table>
                    <thead><tr><th>Tên</th><th>SĐT</th><th>Email</th><th>Ngày tạo</th></tr></thead>
                    <tbody>
                        {customers.map(c => (
                            <tr key={c.id}>
                                <td style={{ fontWeight: 500 }}>
                                    <a href={`/crm/${spaSlug}/customers/${c.id}`} style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>
                                        {c.name}
                                    </a>
                                </td>
                                <td>{c.phone || '—'}</td>
                                <td style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(c.createdAt).toLocaleDateString('vi-VN')}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {customers.length === 0 && <div className="empty-state"><div className="empty-icon">👥</div><p>Chưa có khách hàng</p></div>}
        </div>
    );
}
