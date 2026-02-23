'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Service { id: string; name: string; durationMin: number; price: number; category: string | null; isActive: boolean; }

export default function CrmServicesPage() {
    const { spaSlug } = useParams();
    const [services, setServices] = useState<Service[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [form, setForm] = useState({ name: '', durationMin: 60, price: 0, category: '' });

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/services`).then(r => r.json()).then(d => setServices(d.services || []));
    }, [spaSlug]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch(`/api/crm/${spaSlug}/services`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
        });
        if (res.ok) { setShowAdd(false); setForm({ name: '', durationMin: 60, price: 0, category: '' }); window.location.reload(); }
    };

    const grouped = services.reduce<Record<string, Service[]>>((acc, s) => {
        const cat = s.category || 'Khác';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(s);
        return acc;
    }, {});

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div><h1>💆 Dịch vụ</h1><p>Menu dịch vụ của Spa</p></div>
                <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm">+ Thêm dịch vụ</button>
            </div>

            {showAdd && (
                <form onSubmit={handleAdd} className="card" style={{ marginBottom: '20px' }}>
                    <div className="grid grid-4">
                        <div className="form-group"><label className="form-label">Tên *</label><input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                        <div className="form-group"><label className="form-label">Thời gian (phút)</label><input className="form-input" type="number" value={form.durationMin} onChange={e => setForm({ ...form, durationMin: parseInt(e.target.value) })} /></div>
                        <div className="form-group"><label className="form-label">Giá (VND)</label><input className="form-input" type="number" value={form.price} onChange={e => setForm({ ...form, price: parseInt(e.target.value) })} /></div>
                        <div className="form-group"><label className="form-label">Danh mục</label><input className="form-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm">Lưu dịch vụ</button>
                </form>
            )}

            {Object.entries(grouped).map(([cat, svcs]) => (
                <div key={cat} style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>{cat}</h3>
                    <div className="grid grid-3">
                        {svcs.map(s => (
                            <div key={s.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <h4 style={{ fontWeight: 600 }}>{s.name}</h4>
                                    <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>{s.isActive ? 'Active' : 'Off'}</span>
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '4px' }}>⏱ {s.durationMin} phút</div>
                                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--accent-secondary)' }}>{s.price.toLocaleString('vi-VN')}₫</div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {services.length === 0 && <div className="empty-state"><div className="empty-icon">💆</div><p>Chưa có dịch vụ</p></div>}
        </div>
    );
}
