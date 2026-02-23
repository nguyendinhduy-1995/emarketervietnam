'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Package {
    id: string; name: string; price: number; totalSessions: number; validityDays: number | null;
    service?: { name: string };
    createdAt: string; isActive: boolean;
}

export default function CrmPackagesPage() {
    const { spaSlug } = useParams();
    const [packages, setPackages] = useState<Package[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [price, setPrice] = useState(0);
    const [totalSessions, setTotalSessions] = useState(10);
    const [validityDays, setValidityDays] = useState('');
    const [serviceId, setServiceId] = useState('');

    useEffect(() => {
        fetchPackages();
        fetchServices();
    }, [spaSlug]);

    const fetchPackages = () => fetch(`/api/crm/${spaSlug}/packages`).then(r => r.json()).then(d => setPackages(d.packages || []));
    const fetchServices = () => fetch(`/api/crm/${spaSlug}/services`).then(r => r.json()).then(d => setServices(d.services || []));

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/crm/${spaSlug}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price, totalSessions, validityDays, serviceId })
            });
            if (res.ok) {
                setIsCreating(false);
                setName('');
                setPrice(0);
                setTotalSessions(10);
                setValidityDays('');
                setServiceId('');
                fetchPackages();
            } else {
                alert('Có lỗi xảy ra khi tạo thẻ liệu trình.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>🎫 Thẻ Liệu Trình (Combo)</h1>
                    <p>Quản lý các gói thẻ liệu trình trả trước cho dịch vụ</p>
                </div>
                {!isCreating && (
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>+ Tạo gói mới</button>
                )}
            </div>

            {isCreating && (
                <div className="card mb-6 animate-in" style={{ marginBottom: '24px' }}>
                    <h3>Tạo Thẻ Liệu Trình Mới</h3>
                    <form onSubmit={handleCreate} className="grid grid-2" style={{ marginTop: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Tên bộ/gói (Ví dụ: Thẻ Triệt lông 10 buổi)</label>
                            <input type="text" className="form-input" required value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dịch vụ (Tùy chọn)</label>
                            <select className="form-input" value={serviceId} onChange={e => setServiceId(e.target.value)}>
                                <option value="">-- Dùng chung --</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Giá bán (VNĐ)</label>
                            <input type="number" className="form-input" required value={price} onChange={e => setPrice(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Số buổi (Sessions)</label>
                            <input type="number" className="form-input" min="1" required value={totalSessions} onChange={e => setTotalSessions(Number(e.target.value))} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Hạn sử dụng (Tính từ ngày mua - Ngày)</label>
                            <input type="number" className="form-input" placeholder="Bỏ trống nếu vĩnh viễn" value={validityDays} onChange={e => setValidityDays(e.target.value)} />
                        </div>

                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '12px' }}>
                            <button type="submit" className="btn btn-primary">Lưu thẻ</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setIsCreating(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                {packages.length === 0 ? (
                    <div className="empty-state">Chưa có thẻ liệu trình nào.</div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tên thẻ</th>
                                    <th>Dịch vụ</th>
                                    <th>Giá bán</th>
                                    <th>Số buổi</th>
                                    <th>Hạn sử dụng</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {packages.map(p => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                                        <td>{p.service ? p.service.name : <span style={{ color: 'var(--text-muted)' }}>Mọi dịch vụ</span>}</td>
                                        <td style={{ color: 'var(--accent-primary)', fontWeight: 'bold' }}>{p.price.toLocaleString()}đ</td>
                                        <td>{p.totalSessions} buổi</td>
                                        <td>{p.validityDays ? `${p.validityDays} ngày` : 'Vĩnh viễn'}</td>
                                        <td>{p.isActive ? <span className="badge badge-success">Sử dụng</span> : <span className="badge badge-neutral">Tạm dừng</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
