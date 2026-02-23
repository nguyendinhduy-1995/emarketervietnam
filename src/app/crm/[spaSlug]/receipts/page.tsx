'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Receipt {
    id: string; total: number; discount: number; paid: number; remaining: number; createdAt: string; voucherCode?: string;
    customer: { name: string; phone: string | null };
    items: Array<{ qty: number; price: number; service: { name: string } }>;
}

export default function CrmReceiptsPage() {
    const { spaSlug } = useParams();
    const [receipts, setReceipts] = useState<Receipt[]>([]);

    // Modal state
    const [isCreating, setIsCreating] = useState(false);
    const [customers, setCustomers] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);

    // Form state
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [voucherCode, setVoucherCode] = useState('');
    const [previewDiscount, setPreviewDiscount] = useState(0);
    const [amountPaid, setAmountPaid] = useState(0);

    useEffect(() => {
        fetchReceipts();
        fetchCustomers();
        fetchServices();
    }, [spaSlug]);

    const fetchReceipts = () => fetch(`/api/crm/${spaSlug}/receipts`).then(r => r.json()).then(d => setReceipts(d.receipts || []));
    const fetchCustomers = () => fetch(`/api/crm/${spaSlug}/customers`).then(r => r.json()).then(d => setCustomers(d.customers || []));
    const fetchServices = () => fetch(`/api/crm/${spaSlug}/services`).then(r => r.json()).then(d => setServices(d.services || []));

    const getSelectedServicePrice = () => {
        const s = services.find(x => x.id === selectedService);
        return s ? s.price : 0;
    };

    const handleApplyVoucher = async () => {
        if (!voucherCode) return;
        const totalAmount = getSelectedServicePrice();
        try {
            const res = await fetch(`/api/crm/${spaSlug}/marketing/vouchers/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: voucherCode, totalAmount })
            });
            const data = await res.json();
            if (res.ok) {
                setPreviewDiscount(data.discount);
            } else {
                alert(data.error || 'Mã không hợp lệ');
                setPreviewDiscount(0);
                setVoucherCode('');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreateReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        const price = getSelectedServicePrice();

        try {
            const res = await fetch(`/api/crm/${spaSlug}/receipts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerId: selectedCustomer,
                    items: [{ serviceId: selectedService, qty: 1, price }],
                    paid: amountPaid,
                    voucherCode: voucherCode || undefined
                })
            });
            if (res.ok) {
                setIsCreating(false);
                setSelectedCustomer('');
                setSelectedService('');
                setVoucherCode('');
                setPreviewDiscount(0);
                setAmountPaid(0);
                fetchReceipts();
            } else {
                const err = await res.json();
                alert(err.error || 'Lỗi tạo phiếu thu');
            }
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1>🧾 Phiếu thu & POS</h1>
                    <p>Tạo phiếu thu, áp dụng khuyến mãi và lịch sử</p>
                </div>
                {!isCreating && (
                    <button className="btn btn-primary" onClick={() => setIsCreating(true)}>+ Tạo phiếu thu</button>
                )}
            </div>

            {isCreating && (
                <div className="card mb-6 animate-in" style={{ marginBottom: '24px' }}>
                    <h3>Tạo Phiếu Thu Mới</h3>
                    <form onSubmit={handleCreateReceipt} className="grid grid-2" style={{ marginTop: '16px' }}>
                        <div className="form-group">
                            <label className="form-label">Khách hàng</label>
                            <select className="form-input" required value={selectedCustomer} onChange={e => setSelectedCustomer(e.target.value)}>
                                <option value="">-- Chọn khách hàng --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Dịch vụ</label>
                            <select className="form-input" required value={selectedService} onChange={e => setSelectedService(e.target.value)}>
                                <option value="">-- Chọn dịch vụ --</option>
                                {services.map(s => <option key={s.id} value={s.id}>{s.name} - {s.price.toLocaleString()}đ</option>)}
                            </select>
                        </div>

                        {selectedService && (
                            <>
                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                    <label className="form-label">Mã giảm giá (Nhập & Lưu)</label>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <input type="text" className="form-input" placeholder="VD: TET2024"
                                            value={voucherCode} onChange={e => setVoucherCode(e.target.value)} />
                                        <button type="button" className="btn btn-secondary" onClick={handleApplyVoucher}>Áp dụng</button>
                                    </div>
                                    {previewDiscount > 0 && (
                                        <p style={{ color: 'var(--success)', marginTop: '4px', fontSize: '13px' }}>
                                            Đã áp dụng giảm: -{previewDiscount.toLocaleString()}đ
                                        </p>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Tổng thanh toán sau giảm</label>
                                    <div className="form-input" style={{ background: 'var(--bg-secondary)', fontWeight: 'bold' }}>
                                        {Math.max(0, getSelectedServicePrice() - previewDiscount).toLocaleString()}đ
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Khách đưa (VNĐ)</label>
                                    <input type="number" className="form-input" required min="0"
                                        value={amountPaid} onChange={e => setAmountPaid(Number(e.target.value))} />
                                </div>
                            </>
                        )}

                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '8px' }}>
                            <button type="submit" className="btn btn-primary" disabled={!selectedService}>Tạo phiếu thu</button>
                            <button type="button" className="btn btn-ghost" onClick={() => setIsCreating(false)}>Hủy</button>
                        </div>
                    </form>
                </div>
            )}

            {receipts.length === 0 ? (
                <div className="empty-state"><div className="empty-icon">🧾</div><p>Chưa có phiếu thu</p></div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead><tr><th>Khách hàng</th><th>Dịch vụ</th><th>Tổng Giá</th><th>Giảm giá</th><th>Khách Trả</th><th>Còn lại</th><th>Ngày</th></tr></thead>
                        <tbody>
                            {receipts.map(r => (
                                <tr key={r.id}>
                                    <td style={{ fontWeight: 500 }}>{r.customer.name}</td>
                                    <td style={{ fontSize: '13px' }}>{r.items.map(i => `${i.service.name}`).join(', ')}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{(r.total + (r.discount || 0)).toLocaleString('vi-VN')}₫</td>
                                    <td style={{ color: 'var(--success)' }}>
                                        {r.discount > 0 ? `-${r.discount.toLocaleString()}₫` : '-'}
                                        {r.voucherCode && <span className="badge badge-success" style={{ marginLeft: '4px', fontSize: '10px' }}>{r.voucherCode}</span>}
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{r.paid.toLocaleString('vi-VN')}₫</td>
                                    <td style={{ color: r.remaining > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{r.remaining.toLocaleString('vi-VN')}₫</td>
                                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
