'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type Product = {
    id: string;
    name: string;
    categoryId: string | null;
    sku: string | null;
    price: number;
    costPrice: number;
    stockQuantity: number;
    reorderLevel: number;
    category?: { name: string };
};

type Category = { id: string; name: string };

export default function InventoryProductsPage() {
    const { spaSlug } = useParams();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modals state
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isStockModalOpen, setIsStockModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Forms
    const [productForm, setProductForm] = useState({
        name: '', categoryId: '', sku: '', price: 0, costPrice: 0, reorderLevel: 0
    });
    const [stockForm, setStockForm] = useState({
        type: 'IN', quantity: 1, notes: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resProd, resCat] = await Promise.all([
                fetch(`/api/crm/${spaSlug}/inventory/products`),
                fetch(`/api/crm/${spaSlug}/inventory/categories`)
            ]);
            const dataProd = await resProd.json();
            const dataCat = await resCat.json();
            setProducts(Array.isArray(dataProd) ? dataProd : []);
            setCategories(Array.isArray(dataCat) ? dataCat : []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [spaSlug]);

    const handleOpenProductModal = (p?: Product) => {
        if (p) {
            setEditingId(p.id);
            setProductForm({
                name: p.name, categoryId: p.categoryId || '', sku: p.sku || '',
                price: p.price, costPrice: p.costPrice, reorderLevel: p.reorderLevel
            });
        } else {
            setEditingId(null);
            setProductForm({ name: '', categoryId: '', sku: '', price: 0, costPrice: 0, reorderLevel: 0 });
        }
        setIsProductModalOpen(true);
    };

    const handleOpenStockModal = (p: Product) => {
        setSelectedProduct(p);
        setStockForm({ type: 'IN', quantity: 1, notes: '' });
        setIsStockModalOpen(true);
    };

    const handleProductSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const url = editingId
            ? `/api/crm/${spaSlug}/inventory/products/${editingId}`
            : `/api/crm/${spaSlug}/inventory/products`;
        const method = editingId ? 'PUT' : 'POST';

        // Format numbers
        const payload = {
            ...productForm,
            categoryId: productForm.categoryId || null,
            price: Number(productForm.price),
            costPrice: Number(productForm.costPrice),
            reorderLevel: Number(productForm.reorderLevel),
        };

        try {
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Failed to save');
            }
            setIsProductModalOpen(false);
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleStockSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await fetch(`/api/crm/${spaSlug}/inventory/transactions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: selectedProduct.id,
                    type: stockForm.type,
                    quantity: Number(stockForm.quantity),
                    notes: stockForm.notes,
                })
            });

            const d = await res.json();
            if (!res.ok) throw new Error(d.error || 'Thao tác kho thất bại');

            setIsStockModalOpen(false);
            fetchData(); // Refresh list to get new stock
        } catch (err: any) {
            alert(err.message); // Using alert for modal error briefly
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xoá sản phẩm này sẽ xoá toàn bộ lịch sử Nhập/Xuất của nó. Chắc chắn chứ?')) return;
        try {
            const res = await fetch(`/api/crm/${spaSlug}/inventory/products/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading && products.length === 0) return <div className="loading spinner"></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Danh sách Sản phẩm</h2>
                <button className="btn btn-primary" onClick={() => handleOpenProductModal()}>+ Thêm sản phẩm</button>
            </div>

            {error && <div className="notification error">{error}</div>}

            <div className="card table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Sản phẩm / SKU</th>
                            <th>Danh mục</th>
                            <th>Giá nhập</th>
                            <th>Giá bán</th>
                            <th>Tồn kho</th>
                            <th>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map(p => (
                            <tr key={p.id}>
                                <td>
                                    <strong>{p.name}</strong><br />
                                    <small style={{ color: 'var(--text-muted)' }}>{p.sku || 'No SKU'}</small>
                                </td>
                                <td>{p.category?.name || '-'}</td>
                                <td>{new Intl.NumberFormat('vi-VN').format(p.costPrice)}đ</td>
                                <td>{new Intl.NumberFormat('vi-VN').format(p.price)}đ</td>
                                <td>
                                    <span className={`badge ${p.stockQuantity <= p.reorderLevel ? 'danger' : 'success'}`}>
                                        {p.stockQuantity} (Mức báo: {p.reorderLevel})
                                    </span>
                                </td>
                                <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => handleOpenStockModal(p)}>📦 Nhập/Xuất</button>
                                    <button onClick={() => handleOpenProductModal(p)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                                    <button onClick={() => handleDelete(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Chưa có sản phẩm nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Product CRUD Modal */}
            {isProductModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '600px' }}>
                        <h3>{editingId ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</h3>
                        <form onSubmit={handleProductSubmit}>
                            <div className="grid grid-2">
                                <div className="form-group">
                                    <label>Tên sản phẩm *</label>
                                    <input required type="text" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Mã SKU</label>
                                    <input type="text" value={productForm.sku} onChange={e => setProductForm({ ...productForm, sku: e.target.value })} />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Danh mục</label>
                                <select value={productForm.categoryId} onChange={e => setProductForm({ ...productForm, categoryId: e.target.value })}>
                                    <option value="">-- Chọn danh mục --</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-3">
                                <div className="form-group">
                                    <label>Giá nhập (VND)</label>
                                    <input required type="number" min="0" value={productForm.costPrice} onChange={e => setProductForm({ ...productForm, costPrice: Number(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label>Giá bán (VND)</label>
                                    <input required type="number" min="0" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: Number(e.target.value) })} />
                                </div>
                                <div className="form-group">
                                    <label>Mức cảnh báo tồn</label>
                                    <input required type="number" min="0" value={productForm.reorderLevel} onChange={e => setProductForm({ ...productForm, reorderLevel: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsProductModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stock Transaction Modal */}
            {isStockModalOpen && selectedProduct && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>Nhập / Xuất Kho: <span style={{ color: 'var(--primary-color)' }}>{selectedProduct.name}</span></h3>
                        <p style={{ marginBottom: '16px', color: 'var(--text-muted)' }}>Tồn hiện tại: <strong>{selectedProduct.stockQuantity}</strong></p>

                        <form onSubmit={handleStockSubmit}>
                            <div className="form-group">
                                <label>Loại giao dịch *</label>
                                <select value={stockForm.type} onChange={e => setStockForm({ ...stockForm, type: e.target.value })}>
                                    <option value="IN">Nhập kho (Thêm)</option>
                                    <option value="OUT">Xuất kho (Trừ)</option>
                                    <option value="ADJUSTMENT">Điều chỉnh (Hư hỏng/Mất mát)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Số lượng *</label>
                                <input required type="number" min="1" value={stockForm.quantity} onChange={e => setStockForm({ ...stockForm, quantity: Number(e.target.value) })} />
                            </div>
                            <div className="form-group">
                                <label>Ghi chú</label>
                                <textarea value={stockForm.notes} onChange={e => setStockForm({ ...stockForm, notes: e.target.value })} rows={2} placeholder="Phiếu nhập từ NCC X..." />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsStockModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Đang xử lý...' : 'Xác nhận kho'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
