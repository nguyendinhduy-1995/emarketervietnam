'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Staff {
    id: string;
    name: string;
    phone: string | null;
    role: string;
    baseSalary: number;
    isActive: boolean;
}

export default function StaffPage() {
    const { spaSlug } = useParams();
    const [staffList, setStaffList] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Staff>>({});
    const [search, setSearch] = useState('');

    const fetchStaff = () => {
        setLoading(true);
        const q = search ? `?search=${encodeURIComponent(search)}` : '';
        fetch(`/api/crm/${spaSlug}/staff${q}`)
            .then((r) => r.json())
            .then((d) => {
                setStaffList(d.staff || []);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchStaff();
    }, [spaSlug, search]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = formData.id
            ? `/api/crm/${spaSlug}/staff/${formData.id}`
            : `/api/crm/${spaSlug}/staff`;
        const method = formData.id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: formData.name,
                phone: formData.phone || null,
                role: formData.role || 'STAFF',
                baseSalary: Number(formData.baseSalary) || 0,
                isActive: formData.isActive ?? true,
            }),
        });

        if (res.ok) {
            setIsEditing(false);
            setFormData({});
            fetchStaff();
        } else {
            alert('Lỗi khi lưu nhân viên');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa nhân viên này?')) return;
        const res = await fetch(`/api/crm/${spaSlug}/staff/${id}`, { method: 'DELETE' });
        if (res.ok) fetchStaff();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>👥 Quản lý Nhân viên</h1>
                    <p>Danh sách nhân sự và lương cơ bản</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setFormData({ role: 'STAFF', baseSalary: 0, isActive: true });
                        setIsEditing(true);
                    }}
                >
                    + Thêm Nhân viên
                </button>
            </div>

            <div className="card" style={{ marginBottom: '24px' }}>
                <div className="search-bar" style={{ margin: 0 }}>
                    <span>🔍</span>
                    <input
                        placeholder="Tìm kiếm nhân viên..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner" /></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Tên nhân viên</th>
                                <th>Số điện thoại</th>
                                <th>Vai trò</th>
                                <th>Lương cơ bản</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {staffList.length === 0 ? (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>Chưa có nhân viên nào</td></tr>
                            ) : (
                                staffList.map((s) => (
                                    <tr key={s.id}>
                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                        <td>{s.phone || '-'}</td>
                                        <td><span className="badge badge-info">{s.role}</span></td>
                                        <td>{s.baseSalary.toLocaleString('vi-VN')} đ</td>
                                        <td>
                                            <span className={`badge ${s.isActive ? 'badge-success' : 'badge-neutral'}`}>
                                                {s.isActive ? 'Đang làm' : 'Đã nghỉ'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setFormData(s); setIsEditing(true); }}>Sửa</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id)} style={{ color: 'var(--danger-color)' }}>Xóa</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditing && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>{formData.id ? 'Sửa Nhân viên' : 'Thêm Nhân viên'}</h2>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Tên nhân viên *</label>
                                <input required value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Số điện thoại</label>
                                <input value={formData.phone || ''} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Vai trò</label>
                                <select value={formData.role || 'STAFF'} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                    <option value="STAFF">Nhân viên (STAFF)</option>
                                    <option value="MANAGER">Quản lý (MANAGER)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Lương cơ bản (VND)</label>
                                <input type="number" min="0" value={formData.baseSalary || 0} onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })} />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input type="checkbox" checked={formData.isActive ?? true} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} />
                                <label style={{ marginBottom: 0 }}>Đang làm việc (Active)</label>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Lưu lại</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
