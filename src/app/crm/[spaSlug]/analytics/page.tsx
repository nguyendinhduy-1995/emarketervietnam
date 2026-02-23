'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface AnalyticsData {
    metrics: {
        totalCustomers: number;
        totalRevenue: number;
        potentialRevenue: number;
        appointmentsToday: number;
    };
    recentReceipts: Array<{ id: string; total: number; paid: number; createdAt: string; customer: { name: string } }>;
}

export default function AnalyticsPage() {
    const { spaSlug } = useParams();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/analytics`)
            .then(res => res.json())
            .then(d => {
                if (d.metrics) setData(d);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [spaSlug]);

    if (isLoading) return <div className="loading-spinner" style={{ margin: '40px auto' }}></div>;
    if (!data) return <div className="empty-state">Không thể tải dữ liệu báo cáo.</div>;

    const { metrics, recentReceipts } = data;

    return (
        <div className="animate-in">
            <div className="page-header">
                <h1>📈 Báo Cáo Kinh Doanh</h1>
                <p>Tổng quan hiệu quả hoạt động kinh doanh</p>
            </div>

            <div className="grid grid-4" style={{ marginBottom: '32px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Doanh thu thực nhận</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)' }}>
                        {metrics.totalRevenue.toLocaleString()}đ
                    </div>
                </div>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Doanh thu dự kiến (Tổng)</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold' }}>
                        {metrics.potentialRevenue.toLocaleString()}đ
                    </div>
                </div>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Tổng Khách hàng</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                        {metrics.totalCustomers.toLocaleString()}
                    </div>
                </div>
                <div className="card" style={{ padding: '24px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '8px' }}>Lịch hẹn hôm nay</div>
                    <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)' }}>
                        {metrics.appointmentsToday.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginBottom: '16px' }}>5 Giao dịch (Phiếu Thu) Gần Nhất</h3>
                {recentReceipts.length === 0 ? (
                    <div className="empty-state">Chưa có giao dịch nào.</div>
                ) : (
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Khách hàng</th>
                                    <th>Thực thu / Tổng</th>
                                    <th>Thời gian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentReceipts.map(r => (
                                    <tr key={r.id}>
                                        <td style={{ fontWeight: 500 }}>{r.customer.name}</td>
                                        <td>
                                            <span style={{ color: 'var(--success)', fontWeight: 600 }}>{r.paid.toLocaleString()}đ</span>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}> / {r.total.toLocaleString()}đ</span>
                                        </td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                            {new Date(r.createdAt).toLocaleString('vi-VN')}
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
