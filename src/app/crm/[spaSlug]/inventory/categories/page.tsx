'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

type Category = {
    id: string;
    name: string;
    description: string | null;
};

export default function InventoryCategoriesPage() {
    const { spaSlug } = useParams();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState({ name: '', description: '' });
    const [submitting, setSubmitting] = useState(false);

    const fetchCategories = () => {
        setLoading(true);
        fetch(`/api/crm/${spaSlug}/inventory/categories`)
            .then(res => res.json())
            .then(data => {
                if (data.error) throw new Error(data.error);
                setCategories(Array.isArray(data) ? data : []);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchCategories();
    }, [spaSlug]);

    const handleOpenModal = (cat?: Category) => {
        if (cat) {
            setEditingId(cat.id);
            setForm({ name: cat.name, description: cat.description || '' });
        } else {
            setEditingId(null);
            setForm({ name: '', description: '' });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        const url = editingId
            ? `/api/crm/${spaSlug}/inventory/categories/${editingId}`
            : `/api/crm/${spaSlug}/inventory/categories`;
        const method = editingId ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to save');

            setIsModalOpen(false);
            fetchCategories();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bạn có chắc chắn muốn xoá danh mục này?')) return;
        try {
            const res = await fetch(`/api/crm/${spaSlug}/inventory/categories/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to delete');
            fetchCategories();
        } catch (err: any) {
            alert(err.message);
        }
    };

    if (loading && categories.length === 0) return <div className="loading spinner"></div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2>Danh mục sản phẩm</h2>
                <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Thêm mới</button>
            </div>

            {error && <div className="notification error">{error}</div>}

            <div className="card table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>Tên danh mục</th>
                            <th>Mô tả</th>
                            <th style={{ width: '120px' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map(cat => (
                            <tr key={cat.id}>
                                <td><strong>{cat.name}</strong></td>
                                <td style={{ color: 'var(--text-muted)' }}>{cat.description || '-'}</td>
                                <td>
                                    <button onClick={() => handleOpenModal(cat)} style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '8px' }}>✏️</button>
                                    <button onClick={() => handleDelete(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                                </td>
                            </tr>
                        ))}
                        {categories.length === 0 && (
                            <tr>
                                <td colSpan={3} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Chưa có danh mục nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>{editingId ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label>Tên danh mục *</label>
                                <input required type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div className="form-group">
                                <label>Mô tả</label>
                                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                            </div>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>
                                    {submitting ? 'Đang lưu...' : 'Lưu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
