'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface CustomerPackage {
    id: string; totalSessions: number; usedSessions: number; status: string; expiresAt: string | null; createdAt: string;
    package: { name: string; price: number; }
}

export default function CustomerProfilePage() {
    const { spaSlug, id } = useParams();
    const [customerPkgs, setCustomerPkgs] = useState<CustomerPackage[]>([]);
    const [availablePackages, setAvailablePackages] = useState<any[]>([]);
    const [selectedPackage, setSelectedPackage] = useState('');
    const [isSelling, setIsSelling] = useState(false);

    useEffect(() => {
        fetchCustomerPkgs();
        fetchAvailablePackages();
    }, [spaSlug, id]);

    const fetchCustomerPkgs = () => fetch(`/api/crm/${spaSlug}/customers/${id}/packages`).then(r => r.json()).then(d => setCustomerPkgs(d.customerPackages || []));
    const fetchAvailablePackages = () => fetch(`/api/crm/${spaSlug}/packages`).then(r => r.json()).then(d => setAvailablePackages(d.packages || []));

    const handleAssignPackage = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/crm/${spaSlug}/customers/${id}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ packageId: selectedPackage })
            });
            if (res.ok) {
                setIsSelling(false);
                setSelectedPackage('');
                fetchCustomerPkgs();
            } else {
                alert('Có lỗi xảy ra khi bán thẻ.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUseSession = async (customerPackageId: string) => {
        if (!confirm('Xác nhận trừ 1 buổi của thẻ này?')) return;
        try {
            const res = await fetch(`/api/crm/${spaSlug}/customers/${id}/packages/use`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ customerPackageId })
            });
            if (res.ok) {
                fetchCustomerPkgs();
            } else {
                const err = await res.json();
                alert(err.error || 'Có lỗi xảy ra.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="animate-in">
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>👤 Hồ Sơ Khách Hàng</h1>
                    <p>Quản lý thẻ liệu trình và lịch sử</p>
                </div>
                <a href={`/crm/${spaSlug}/customers`} className="btn btn-ghost">← Quay lại</a>
            </div>

            <div className="grid grid-2" style={{ gap: '24px' }}>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3>🎫 Thẻ Liệu Trình Đã Mua</h3>
                        {!isSelling && <button onClick={() => setIsSelling(true)} className="btn btn-primary btn-sm">+ Bán Thẻ Mới</button>}
                    </div>

                    {isSelling && (
                        <form onSubmit={handleAssignPackage} style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                            <div className="form-group">
                                <label className="form-label">Chọn thẻ cần bán</label>
                                <select className="form-input" required value={selectedPackage} onChange={e => setSelectedPackage(e.target.value)}>
                                    <option value="">-- Chọn gói --</option>
                                    {availablePackages.filter(p => p.isActive).map(p => (
                                        <option key={p.id} value={p.id}>{p.name} - {p.price.toLocaleString()}đ ({p.totalSessions} buổi)</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <button type="submit" className="btn btn-primary btn-sm">Bán Thẻ</button>
                                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsSelling(false)}>Hủy</button>
                            </div>
                        </form>
                    )}

                    {customerPkgs.length === 0 ? (
                        <div className="empty-state">Khách hàng chưa mua thẻ nào.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {customerPkgs.map(cp => (
                                <div key={cp.id} style={{ padding: '16px', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>{cp.package.name}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            Ngày mua: {new Date(cp.createdAt).toLocaleDateString('vi-VN')}
                                            {cp.expiresAt && ` - HSD: ${new Date(cp.expiresAt).toLocaleDateString('vi-VN')}`}
                                        </div>
                                        <div style={{ marginTop: '8px' }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{cp.usedSessions}</span> / {cp.totalSessions} buổi đã dùng
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span className={`badge badge-${cp.status === 'ACTIVE' ? 'success' : cp.status === 'EXHAUSTED' ? 'warning' : 'danger'}`} style={{ marginBottom: '8px', display: 'inline-block' }}>
                                            {cp.status}
                                        </span>
                                        <br />
                                        {cp.status === 'ACTIVE' && (
                                            <button onClick={() => handleUseSession(cp.id)} className="btn btn-secondary btn-sm">Trừ 1 buổi</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Future: History, points, etc can go in the second column */}
                <div>
                    <div className="card">
                        <h3>Thông tin khác</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '8px' }}>Các tính năng lịch sử mua hàng, lịch hẹn sẽ được hiển thị tại đây.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
