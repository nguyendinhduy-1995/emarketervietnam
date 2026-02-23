'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PayslipsPage() {
    const { spaSlug } = useParams();
    const [payslips, setPayslips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());

    const fetchPayslips = () => {
        setLoading(true);
        fetch(`/api/crm/${spaSlug}/payroll/payslips?month=${month}&year=${year}`)
            .then((r) => r.json())
            .then((d) => {
                setPayslips(d.payslips || []);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchPayslips();
    }, [spaSlug, month, year]);

    const handleGenerate = async () => {
        if (!confirm(`Tạo bảng lương tự động cho tháng ${month}/${year}? Dữ liệu cũ của DRAFT sẽ được cập nhật lại.`)) return;
        setIsGenerating(true);
        const res = await fetch(`/api/crm/${spaSlug}/payroll/payslips/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ month, year }),
        });
        setIsGenerating(false);
        if (res.ok) {
            alert('Tạo bảng lương thành công!');
            fetchPayslips();
        } else {
            alert('Lỗi tạo bảng lương');
        }
    };

    const handleMarkPaid = async (id: string) => {
        if (!confirm('Xác nhận đã thanh toán lương?')) return;
        const res = await fetch(`/api/crm/${spaSlug}/payroll/payslips/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PAID' }),
        });
        if (res.ok) fetchPayslips();
    };

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>📄 Bảng lương (Payslips)</h1>
                    <p>Xem và chốt lương nhân viên hàng tháng</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="month"
                        className="form-input"
                        value={`${year}-${String(month).padStart(2, '0')}`}
                        onChange={(e) => {
                            if (e.target.value) {
                                const [y, m] = e.target.value.split('-');
                                setYear(Number(y));
                                setMonth(Number(m));
                            }
                        }}
                    />
                    <button className="btn btn-primary" onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? 'Đang tạo...' : '🔄 Tạo bảng lương tháng này'}
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}><div className="loading-spinner" /></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Nhân viên</th>
                                <th>Lương cơ bản</th>
                                <th>Hoa hồng</th>
                                <th>Phụ cấp / Khấu trừ</th>
                                <th>Thực nhận</th>
                                <th>Trạng thái</th>
                                <th style={{ textAlign: 'right' }}>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payslips.length === 0 ? (
                                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>Chưa có bảng lương dữ liệu cho tháng này</td></tr>
                            ) : (
                                payslips.map((p) => (
                                    <tr key={p.id}>
                                        <td style={{ fontWeight: 500 }}>
                                            {p.staff?.name}
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.month}/{p.year}</div>
                                        </td>
                                        <td>{p.baseSalary.toLocaleString('vi-VN')} đ</td>
                                        <td style={{ color: 'var(--success-color)' }}>+{p.totalCommission.toLocaleString('vi-VN')} đ</td>
                                        <td>
                                            <div style={{ color: 'var(--info-color)' }}>+{p.totalAllowance.toLocaleString('vi-VN')}</div>
                                            <div style={{ color: 'var(--danger-color)' }}>-{p.totalDeduction.toLocaleString('vi-VN')}</div>
                                        </td>
                                        <td style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                            {p.netPay.toLocaleString('vi-VN')} đ
                                        </td>
                                        <td>
                                            <span className={`badge ${p.status === 'PAID' ? 'badge-success' : 'badge-warning'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            {p.status === 'DRAFT' && (
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleMarkPaid(p.id)} style={{ color: 'var(--success-color)' }}>
                                                    ✓ Đánh dấu Đã Chi
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
