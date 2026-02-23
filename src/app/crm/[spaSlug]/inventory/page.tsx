'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function InventoryDashboard() {
    const { spaSlug } = useParams();
    const [products, setProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/inventory/products`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setProducts(Array.isArray(data) ? data : []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [spaSlug]);

    if (loading) return <div className="loading spinner"></div>;
    if (error) return <div className="notification error">{error}</div>;

    const lowStockProducts = products.filter(p => p.stockQuantity <= p.reorderLevel);
    const outOfStockProducts = products.filter(p => p.stockQuantity <= 0);
    const totalValue = products.reduce((sum, p) => sum + (p.costPrice * Math.max(0, p.stockQuantity)), 0);

    return (
        <div>
            <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                <div className="card stat-card">
                    <div className="stat-value">{products.length}</div>
                    <div className="stat-label">Tổng sản phẩm</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value" style={{ color: outOfStockProducts.length > 0 ? 'var(--danger-color)' : 'inherit' }}>
                        {outOfStockProducts.length}
                    </div>
                    <div className="stat-label">Hết hàng</div>
                </div>
                <div className="card stat-card">
                    <div className="stat-value">{new Intl.NumberFormat('vi-VN').format(totalValue)}đ</div>
                    <div className="stat-label">Tổng giá trị tồn kho</div>
                </div>
            </div>

            <div className="card">
                <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>Cảnh báo tồn kho</h2>
                {lowStockProducts.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>Mức tồn kho ổn định, không có sản phẩm nào cần nhập thêm.</p>
                ) : (
                    <div className="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tên sản phẩm</th>
                                    <th>SKU</th>
                                    <th>Tồn hiện tại</th>
                                    <th>Mức cảnh báo</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {lowStockProducts.map(p => (
                                    <tr key={p.id}>
                                        <td>
                                            <Link href={`/crm/${spaSlug}/inventory/products`} style={{ color: 'var(--primary-color)' }}>
                                                {p.name}
                                            </Link>
                                        </td>
                                        <td>{p.sku || '-'}</td>
                                        <td><strong>{p.stockQuantity}</strong></td>
                                        <td>{p.reorderLevel}</td>
                                        <td>
                                            <span className={`badge ${p.stockQuantity <= 0 ? 'danger' : 'warning'}`}>
                                                {p.stockQuantity <= 0 ? 'Hết hàng' : 'Sắp hết'}
                                            </span>
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
