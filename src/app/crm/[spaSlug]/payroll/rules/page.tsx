'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CommissionRulesPage() {
    const { spaSlug } = useParams();
    const [rules, setRules] = useState<any[]>([]);
    const [staffList, setStaffList] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({});

    const fetchData = async () => {
        setLoading(true);
        const [rRes, sRes, svRes] = await Promise.all([
            fetch(`/api/crm/${spaSlug}/payroll/rules`),
            fetch(`/api/crm/${spaSlug}/staff`),
            fetch(`/api/crm/${spaSlug}/services`),
        ]);
        const rData = await rRes.json();
        const sData = await sRes.json();
        const svData = await svRes.json();
        setRules(rData.rules || []);
        setStaffList(sData.staff || []);
        setServices(svData.services || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [spaSlug]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = formData.id
            ? `/api/crm/${spaSlug}/payroll/rules/${formData.id}`
            : `/api/crm/${spaSlug}/payroll/rules`;
        const method = formData.id ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: formData.staffId || null,
                serviceId: formData.serviceId || null,
                type: formData.type || 'PERCENTAGE',
                value: Number(formData.value) || 0,
            }),
        });

        if (res.ok) {
            setIsEditing(false);
            setFormData({});
            fetchData();
        } else {
            alert('Lỗi khi lưu rule');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc muốn xóa cấu hình này?')) return;
        const res = await fetch(`/api/crm/${spaSlug}/payroll/rules/${id}`, { method: 'DELETE' });
        if (res.ok) fetchData();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Cấu hình Hoa hồng</h1>
                    <p>Thiết lập luật chia hoa hồng theo dịch vụ / nhân viên</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        setFormData({ type: 'PERCENTAGE', value: 0 });
                        setIsEditing(true);
                    }}
                >
                    + Thêm Cấu hình
                </button>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner" /></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Áp dụng Nhân viên</th>
                                <th>Áp dụng Dịch vụ</th>
                                <th>Loại hoa hồng</th>
                                <th>Mức hưởng</th>
                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rules.length === 0 ? (
                                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px' }}>Chưa có cấu hình nào</td></tr>
                            ) : (
                                rules.map((r) => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 500 }}>{r.staff?.name || '--- Tất cả ---'}</td>
                                        <td>{r.service?.name || '--- Tất cả ---'}</td>
                                        <td><span className="badge badge-info">{r.type === 'PERCENTAGE' ? '% Phần trăm' : 'Tiền mặt'}</span></td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>
                                            {r.type === 'PERCENTAGE' ? `${r.value}%` : `${r.value.toLocaleString('vi-VN')} đ`}
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setFormData(r); setIsEditing(true); }}>Sửa</button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(r.id)} style={{ color: 'var(--danger-color)' }}>Xóa</button>
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
                        <h2>{formData.id ? 'Sửa Cấu hình' : 'Thêm Cấu hình Mới'}</h2>
                        <form onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Áp dụng cho Nhân viên</label>
                                <select value={formData.staffId || ''} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}>
                                    <option value="">--- Tất cả nhân viên ---</option>
                                    {staffList.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Áp dụng cho Dịch vụ</label>
                                <select value={formData.serviceId || ''} onChange={(e) => setFormData({ ...formData, serviceId: e.target.value })}>
                                    <option value="">--- Tất cả dịch vụ ---</option>
                                    {services.map((sv) => (
                                        <option key={sv.id} value={sv.id}>{sv.name} ({sv.price.toLocaleString('vi-VN')} đ)</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Loại hoa hồng</label>
                                <select value={formData.type || 'PERCENTAGE'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                    <option value="PERCENTAGE">% Phần trăm</option>
                                    <option value="FIXED">Số tiền cố định (VND)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Mức hưởng {formData.type === 'PERCENTAGE' ? '(%)' : '(VND)'} *</label>
                                <input type="number" min="0" required value={formData.value || 0} onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })} />
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
