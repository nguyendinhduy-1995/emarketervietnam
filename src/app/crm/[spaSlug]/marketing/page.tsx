'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function MarketingPage() {
    const params = useParams();
    const spaSlug = params.spaSlug as string;

    const [vouchers, setVouchers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isCreating, setIsCreating] = useState(false);
    const [newVoucher, setNewVoucher] = useState({
        code: '', type: 'PERCENT', value: 0, minOrderValue: 0, maxDiscount: 0, limit: 100
    });

    useEffect(() => {
        fetchVouchers();
    }, [spaSlug]);

    const fetchVouchers = async () => {
        try {
            const res = await fetch(`/api/crm/${spaSlug}/marketing/vouchers`);
            if (res.ok) {
                const data = await res.json();
                setVouchers(data);
            }
        } catch (error) {
            console.error('Failed to fetch vouchers', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/crm/${spaSlug}/marketing/vouchers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVoucher),
            });
            if (res.ok) {
                setIsCreating(false);
                setNewVoucher({ code: '', type: 'PERCENT', value: 0, minOrderValue: 0, maxDiscount: 0, limit: 100 });
                fetchVouchers();
            } else {
                const { error } = await res.json();
                alert(error || 'Lỗi tạo mã giảm giá');
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading) return <div className="loading-spinner" style={{ margin: '40px auto' }}></div>;

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>🎁 Khuyến mãi & Loyalty</h1>
                    <p>Quản lý mã giảm giá và hạng thành viên</p>
                </div>
                {!isCreating && (
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>
                        + Tạo Mã Mới
                    </button>
                )}
            </div>

            {isCreating && (
                <div className="card mb-6 animate-in" style={{ marginBottom: '24px' }}>
                    <h3 style={{ marginBottom: '16px' }}>Tạo mã giảm giá mới</h3>
                    <form onSubmit={handleCreate} className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Mã (VD: TET2024)</label>
                            <input type="text" className="form-input" required
                                value={newVoucher.code} onChange={e => setNewVoucher({ ...newVoucher, code: e.target.value.toUpperCase() })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Loại giảm giá</label>
                            <select className="form-input" value={newVoucher.type} onChange={e => setNewVoucher({ ...newVoucher, type: e.target.value })}>
                                <option value="PERCENT">% Phần trăm</option>
                                <option value="FIXED">Số tiền cố định</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Mức giảm ({newVoucher.type === 'PERCENT' ? '%' : 'VNĐ'})</label>
                            <input type="number" className="form-input" required min="1"
                                value={newVoucher.value} onChange={e => setNewVoucher({ ...newVoucher, value: Number(e.target.value) })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Đơn tối thiểu (VNĐ)</label>
                            <input type="number" className="form-input"
                                value={newVoucher.minOrderValue} onChange={e => setNewVoucher({ ...newVoucher, minOrderValue: Number(e.target.value) })} />
                        </div>
                        {newVoucher.type === 'PERCENT' && (
                            <div className="form-group">
                                <label className="form-label">Giảm tối đa (VNĐ)</label>
                                <input type="number" className="form-input"
                                    value={newVoucher.maxDiscount} onChange={e => setNewVoucher({ ...newVoucher, maxDiscount: Number(e.target.value) })} />
                            </div>
                        )}
                        <div className="form-group">
                            <label className="form-label">Giới hạn số lần dùng</label>
                            <input type="number" className="form-input" required min="1"
                                value={newVoucher.limit} onChange={e => setNewVoucher({ ...newVoucher, limit: Number(e.target.value) })} />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button type="submit" className="btn btn-primary">Lưu mã giảm giá</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setIsCreating(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card">
                <h3>Danh sách mã giảm giá</h3>
                {vouchers.length === 0 ? (
                    <div className="empty-state">Chưa có mã giảm giá nào.</div>
                ) : (
                    <div className="table-container" style={{ marginTop: '16px' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Mã</th>
                                    <th>Mức giảm</th>
                                    <th>Đơn tối thiểu</th>
                                    <th>Đã dùng</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vouchers.map(v => (
                                    <tr key={v.id}>
                                        <td><strong>{v.code}</strong></td>
                                        <td>{v.type === 'PERCENT' ? `${v.value}%` : `${v.value.toLocaleString()}đ`}</td>
                                        <td>{v.minOrderValue.toLocaleString()}đ</td>
                                        <td>{v.used} / {v.limit}</td>
                                        <td>
                                            {v.isActive ? (
                                                <span className="badge badge-success">Sẵn sàng</span>
                                            ) : (
                                                <span className="badge badge-neutral">Đã khóa</span>
                                            )}
                                        </td>
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
