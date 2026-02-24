'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';

function formatVND(n: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

interface Variant { sku: string; frameColor: string; lensColor: string | null; price: number; compareAtPrice: number | null; stockQty: number; reservedQty: number }
interface Product {
    id: string; name: string; slug: string; brand: string | null; category: string | null;
    status: string; tags: string[]; createdAt: string; updatedAt: string;
    frameShape: string | null; material: string | null; gender: string | null;
    variants: Variant[]; media: { url: string; type: string; sort: number }[];
    publishedAt: string | null;
}
interface Category { id: string; value: string; label: string; icon: string }

const EMOJI_OPTIONS = ['📂', '👓', '🕶️', '🔲', '🔵', '👁️', '🥽', '✨', '🧴', '💎', '🎯', '🔥', '🏷️', '📦', '🎨', '🌟'];

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [catFilter, setCatFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [toast, setToast] = useState('');
    const [sortBy, setSortBy] = useState('updatedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [openKebab, setOpenKebab] = useState<string | null>(null);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [editName, setEditName] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editBrand, setEditBrand] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const [showCategories, setShowCategories] = useState(false);

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCatLabel, setNewCatLabel] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('📂');
    const [editingCat, setEditingCat] = useState<string | null>(null);
    const [editCatLabel, setEditCatLabel] = useState('');
    const [editCatIcon, setEditCatIcon] = useState('');

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

    // ═══ Fetch categories ═══
    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch('/api/smk/admin/categories');
            const data = await res.json();
            setCategories(data.categories || []);
        } catch { /* silent */ }
    }, []);

    useEffect(() => { fetchCategories(); }, [fetchCategories]);

    const addCategory = async () => {
        if (!newCatLabel.trim()) return;
        try {
            const res = await fetch('/api/smk/admin/categories', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: newCatLabel.trim(), icon: newCatIcon }),
            });
            const data = await res.json();
            if (data.error) { showToast(`⚠️ ${data.error}`); return; }
            setCategories(prev => [...prev, data.category]);
            setNewCatLabel(''); setNewCatIcon('📂');
            showToast(`✅ Đã thêm "${data.category.label}"`);
        } catch { showToast('⚠️ Lỗi thêm danh mục'); }
    };

    const updateCategory = async (id: string) => {
        if (!editCatLabel.trim()) return;
        try {
            await fetch('/api/smk/admin/categories', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, label: editCatLabel.trim(), icon: editCatIcon }),
            });
            setCategories(prev => prev.map(c => c.id === id ? { ...c, label: editCatLabel.trim(), icon: editCatIcon } : c));
            setEditingCat(null);
            showToast('✅ Đã cập nhật danh mục');
        } catch { showToast('⚠️ Lỗi cập nhật'); }
    };

    const deleteCat = async (id: string, label: string) => {
        const count = categoryCounts[categories.find(c => c.id === id)?.value || ''] || 0;
        if (!confirm(`Xóa danh mục "${label}"?${count > 0 ? `\n\n⚠️ Có ${count} sản phẩm trong danh mục này.` : ''}`)) return;
        try {
            await fetch('/api/smk/admin/categories', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            setCategories(prev => prev.filter(c => c.id !== id));
            showToast(`🗑️ Đã xóa "${label}"`);
        } catch { showToast('⚠️ Lỗi xóa'); }
    };

    // ═══ Fetch products ═══
    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                search, sortBy, sortOrder,
                ...(filter !== 'all' ? { status: filter } : {}),
            });
            const res = await fetch(`/api/smk/admin/products?${params}`);
            const data = await res.json();
            setProducts(data.products || []);
        } catch { showToast('⚠️ Lỗi tải sản phẩm'); }
        setLoading(false);
    }, [search, filter, sortBy, sortOrder]);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const filteredProducts = catFilter === 'all' ? products : products.filter(p => p.category === catFilter);

    const totalProducts = products.length;
    const activeCount = products.filter(p => p.status === 'ACTIVE').length;
    const draftCount = products.filter(p => p.status === 'DRAFT').length;
    const lowStockCount = products.filter(p => p.variants.some(v => v.stockQty <= 5)).length;

    const categoryCounts: Record<string, number> = {};
    for (const p of products) {
        const cat = p.category || 'Uncategorized';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const getMainImage = (p: Product) => p.media?.find(m => m.sort === 0)?.url || null;
    const getTotalStock = (p: Product) => p.variants.reduce((s, v) => s + v.stockQty, 0);
    const getMinPrice = (p: Product) => Math.min(...p.variants.map(v => v.price));
    const getMaxPrice = (p: Product) => Math.max(...p.variants.map(v => v.price));
    const getCategoryLabel = (value: string | null) => categories.find(c => c.value === value)?.label || value || 'Chưa phân loại';
    const getCategoryIcon = (value: string | null) => categories.find(c => c.value === value)?.icon || '📂';

    const toggleSelect = (id: string) => { setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
    const toggleSelectAll = () => { selectedIds.size === filteredProducts.length ? setSelectedIds(new Set()) : setSelectedIds(new Set(filteredProducts.map(p => p.id))); };

    const bulkPublish = async () => {
        const ids = Array.from(selectedIds); const prev = [...products];
        setProducts(p => p.map(prod => ids.includes(prod.id) ? { ...prod, publishedAt: new Date().toISOString(), status: 'ACTIVE' } : prod));
        setSelectedIds(new Set()); showToast(`🟢 Đã publish ${ids.length} SP`);
        try { for (const id of ids) await fetch('/api/smk/admin/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action: 'publish' }) }); }
        catch { setProducts(prev); showToast('⚠️ Lỗi — đã hoàn tác'); }
    };

    const bulkUnpublish = async () => {
        const ids = Array.from(selectedIds); const prev = [...products];
        setProducts(p => p.map(prod => ids.includes(prod.id) ? { ...prod, publishedAt: null, status: 'DRAFT' } : prod));
        setSelectedIds(new Set()); showToast(`⏸️ Đã ẩn ${ids.length} SP`);
        try { for (const id of ids) await fetch('/api/smk/admin/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'DRAFT' }) }); }
        catch { setProducts(prev); showToast('⚠️ Lỗi — đã hoàn tác'); }
    };

    const deleteProduct = async (id: string, name: string) => {
        if (!confirm(`Xóa sản phẩm "${name}"?\n\nSản phẩm sẽ được archive và có thể khôi phục.`)) return;
        const prev = [...products]; setProducts(p => p.filter(prod => prod.id !== id)); setOpenKebab(null);
        showToast(`🗑️ Đã xóa "${name}"`);
        try { await fetch('/api/smk/admin/products', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); }
        catch { setProducts(prev); showToast('⚠️ Lỗi xóa'); }
    };

    const startEdit = (p: Product) => {
        setEditingProduct(p); setEditName(p.name); setEditCategory(p.category || ''); setEditBrand(p.brand || ''); setOpenKebab(null);
    };

    const saveEdit = async () => {
        if (!editingProduct) return;
        setEditSaving(true);
        try {
            await fetch('/api/smk/admin/products', {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingProduct.id, name: editName, category: editCategory, brand: editBrand }),
            });
            setProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, name: editName, category: editCategory, brand: editBrand } : p));
            showToast('✅ Đã cập nhật'); setEditingProduct(null);
        } catch { showToast('⚠️ Lỗi cập nhật'); }
        setEditSaving(false);
    };

    const exportCSV = () => { window.open('/api/smk/admin/products/bulk', '_blank'); showToast('📥 Đang tải CSV...'); };
    const handleSort = (col: string) => { if (sortBy === col) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); else { setSortBy(col); setSortOrder('desc'); } };
    const SortIcon = ({ col }: { col: string }) => (<span style={{ opacity: sortBy === col ? 1 : 0.3, fontSize: 10, marginLeft: 4 }}>{sortBy === col ? (sortOrder === 'asc' ? '▲' : '▼') : '⇅'}</span>);

    const filterOpts = [
        { value: 'all', label: 'Tất cả', count: totalProducts },
        { value: 'ACTIVE', label: '🟢 Đang bán', count: activeCount },
        { value: 'DRAFT', label: '⏸️ Nháp', count: draftCount },
    ];

    return (
        <div className="animate-in">
            {toast && (<div className="admin-toast admin-toast--visible" style={{ borderLeftColor: 'var(--success)' }}><span className="admin-toast__message">{toast}</span></div>)}

            {/* ═══ Page Title + Actions ═══ */}
            <div className="admin-page-title">
                <nav className="admin-page-title__breadcrumb">
                    <a href="/smk-crm" className="admin-page-title__breadcrumb-link">Admin</a>
                    <span className="admin-page-title__breadcrumb-sep">›</span>
                    <span className="admin-page-title__breadcrumb-current">Sản phẩm</span>
                </nav>
                <div className="admin-page-title__row">
                    <div className="admin-page-title__text">
                        <h1 className="admin-page-title__heading">📦 Sản phẩm</h1>
                        <p className="admin-page-title__subtitle">Quản lý toàn bộ sản phẩm kính mắt</p>
                    </div>
                    <div className="admin-page-title__actions">
                        <button className="btn" onClick={() => setShowCategories(!showCategories)} style={{ fontSize: 11, padding: '6px 12px', minHeight: 36, background: showCategories ? 'rgba(212,168,83,0.15)' : undefined, color: showCategories ? 'var(--gold-400)' : undefined }}>📂 Danh mục</button>
                        <button className="btn" onClick={exportCSV} style={{ fontSize: 11, padding: '6px 12px', minHeight: 36 }}>📥 Xuất CSV</button>
                        <Link href="/smk-crm/products/create" className="btn btn-primary" style={{ fontWeight: 700, textDecoration: 'none', fontSize: 11, padding: '6px 12px', minHeight: 36 }}>+ Đăng SP mới</Link>
                    </div>
                </div>
            </div>

            {/* ═══ Categories Manager ═══ */}
            {showCategories && (
                <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>📂 Quản lý danh mục</h3>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{categories.length} danh mục</span>
                    </div>

                    {/* Add new */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <select value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}
                            style={{ width: 50, padding: '8px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', fontSize: 16, textAlign: 'center', cursor: 'pointer' }}>
                            {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                        <input type="text" value={newCatLabel} onChange={e => setNewCatLabel(e.target.value)}
                            placeholder="Tên danh mục mới..." onKeyDown={e => e.key === 'Enter' && addCategory()}
                            style={{ flex: '1 1 160px', padding: '8px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 13 }} />
                        <button onClick={addCategory} className="btn btn-primary" style={{ fontSize: 11, padding: '8px 16px', minHeight: 36 }} disabled={!newCatLabel.trim()}>+ Thêm</button>
                    </div>

                    {/* Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                        <button onClick={() => setCatFilter('all')} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-3)',
                            borderRadius: 'var(--radius-md)', border: catFilter === 'all' ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)',
                            background: catFilter === 'all' ? 'rgba(212,168,83,0.1)' : 'var(--bg-secondary)', cursor: 'pointer', textAlign: 'left',
                        }}>
                            <span style={{ fontSize: 20 }}>📋</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Tất cả</div>
                                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalProducts} SP</div>
                            </div>
                        </button>

                        {categories.map(cat => {
                            const count = categoryCounts[cat.value] || 0;
                            const isActive = catFilter === cat.value;
                            const isEditing = editingCat === cat.id;
                            return (
                                <div key={cat.id} style={{
                                    display: 'flex', alignItems: 'center', gap: 8, padding: 'var(--space-3)',
                                    borderRadius: 'var(--radius-md)', border: isActive ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)',
                                    background: isActive ? 'rgba(212,168,83,0.1)' : 'var(--bg-secondary)',
                                }}>
                                    {isEditing ? (
                                        <>
                                            <select value={editCatIcon} onChange={e => setEditCatIcon(e.target.value)}
                                                style={{ width: 36, padding: 2, border: 'none', background: 'transparent', fontSize: 16, cursor: 'pointer' }}>
                                                {EMOJI_OPTIONS.map(e => <option key={e} value={e}>{e}</option>)}
                                            </select>
                                            <input type="text" value={editCatLabel} onChange={e => setEditCatLabel(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && updateCategory(cat.id)} autoFocus
                                                style={{ flex: 1, padding: '4px 8px', borderRadius: 4, background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 12, minWidth: 0 }} />
                                            <button onClick={() => updateCategory(cat.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--success)', padding: 2 }}>✓</button>
                                            <button onClick={() => setEditingCat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 2 }}>✕</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => setCatFilter(isActive ? 'all' : cat.value)}
                                                style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                                                <span style={{ fontSize: 20, flexShrink: 0 }}>{cat.icon}</span>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.label}</div>
                                                    <div style={{ fontSize: 11, color: count > 0 ? 'var(--gold-400)' : 'var(--text-muted)' }}>{count} SP</div>
                                                </div>
                                            </button>
                                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                                <button onClick={() => { setEditingCat(cat.id); setEditCatLabel(cat.label); setEditCatIcon(cat.icon); }}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: 2 }} title="Sửa">✏️</button>
                                                <button onClick={() => deleteCat(cat.id, cat.label)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, opacity: 0.6, padding: 2 }} title="Xóa">🗑️</button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ═══ Stat Cards ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                {[
                    { label: 'Tổng', value: totalProducts, icon: '📦', color: 'var(--text-primary)' },
                    { label: 'Đang bán', value: activeCount, icon: '🟢', color: 'var(--success)' },
                    { label: 'Nháp', value: draftCount, icon: '⏸️', color: 'var(--warning)' },
                    { label: 'Hết hàng', value: lowStockCount, icon: '⚠️', color: 'var(--error)' },
                ].map(s => (
                    <div key={s.label} className="admin-stat-card" style={{ textAlign: 'center', padding: 'var(--space-2)' }}>
                        <div style={{ fontSize: 16 }}>{s.icon}</div>
                        <div className="admin-stat-card__value" style={{ fontSize: 'var(--text-lg)', color: s.color }}>{s.value}</div>
                        <div className="admin-stat-card__label">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ═══ Search + Filters ═══ */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                <input className="admin-datatable__search" placeholder="🔍 Tìm tên, SKU..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: '1 1 160px', maxWidth: 240 }} />
                <div className="admin-filter-bar" style={{ marginBottom: 0, paddingBottom: 0 }}>
                    {filterOpts.map(f => (
                        <button key={f.value} className={`admin-filter-bar__chip ${filter === f.value ? 'admin-filter-bar__chip--active' : ''}`} onClick={() => setFilter(f.value)}>
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
                {catFilter !== 'all' && (
                    <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 99, background: 'rgba(212,168,83,0.15)', color: 'var(--gold-400)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        {getCategoryIcon(catFilter)} {getCategoryLabel(catFilter)}
                        <button onClick={() => setCatFilter('all')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold-400)', fontSize: 12, padding: 0, marginLeft: 4 }}>✕</button>
                    </span>
                )}
            </div>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <div className="admin-datatable__bulk-bar" style={{ marginBottom: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'rgba(212,168,83,0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(212,168,83,0.2)' }}>
                    <span className="admin-datatable__bulk-count">📋 {selectedIds.size} đã chọn</span>
                    <button className="admin-datatable__bulk-btn" onClick={bulkPublish}>🟢 Publish</button>
                    <button className="admin-datatable__bulk-btn" onClick={bulkUnpublish}>⏸️ Ẩn</button>
                    <button className="admin-datatable__bulk-btn" onClick={() => setSelectedIds(new Set())}>✕ Bỏ chọn</button>
                </div>
            )}

            {/* ═══ Edit Modal ═══ */}
            {editingProduct && (
                <>
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100 }} onClick={() => setEditingProduct(null)} />
                    <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)', border: '1px solid var(--border-primary)', padding: 'var(--space-5)', width: '90%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto', zIndex: 101 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h3 style={{ margin: 0, fontSize: 'var(--text-lg)', fontWeight: 700 }}>✏️ Sửa sản phẩm</h3>
                            <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: 'var(--text-muted)' }}>✕</button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Tên sản phẩm</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14 }} />
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Danh mục</label>
                                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14, cursor: 'pointer' }}>
                                    <option value="">— Chưa phân loại —</option>
                                    {categories.map(c => <option key={c.id} value={c.value}>{c.icon} {c.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Thương hiệu</label>
                                <input type="text" value={editBrand} onChange={e => setEditBrand(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', color: 'var(--text-primary)', fontSize: 14 }} />
                            </div>
                            <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>💡 Để chỉnh ảnh, biến thể, tồn kho → <Link href={`/admin/products/create?id=${editingProduct.id}`} style={{ color: 'var(--gold-400)' }}>Trang sửa đầy đủ →</Link></p>
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                            <button onClick={() => setEditingProduct(null)} className="btn" style={{ flex: 1 }}>Hủy</button>
                            <button onClick={saveEdit} className="btn btn-primary" disabled={editSaving} style={{ flex: 1 }}>{editSaving ? '💾 Đang lưu...' : '✅ Lưu'}</button>
                        </div>
                    </div>
                </>
            )}

            {/* ═══ Product Listing ═══ */}
            {loading ? (
                <div className="admin-datatable__skeleton">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="admin-datatable__skeleton-row">{Array.from({ length: 4 }).map((_, j) => (<div key={j} className="admin-datatable__skeleton-cell" />))}</div>))}</div>
            ) : filteredProducts.length === 0 ? (
                <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">📦</span>
                    <h3 className="admin-empty-state__title">{search || catFilter !== 'all' ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}</h3>
                    <Link href="/smk-crm/products/create" className="btn btn-primary admin-empty-state__btn" style={{ textDecoration: 'none' }}>➕ Tạo sản phẩm đầu tiên</Link>
                </div>
            ) : (
                <>
                    {/* Mobile cards */}
                    <div className="admin-datatable__cards">
                        {filteredProducts.map(p => {
                            const img = getMainImage(p); const stock = getTotalStock(p); const isLowStock = stock > 0 && stock <= 5;
                            return (
                                <div key={p.id} className={`admin-datatable__card ${selectedIds.has(p.id) ? 'admin-datatable__card--selected' : ''}`}>
                                    {/* A3: Sort handle */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
                                        <button onClick={() => { const idx = products.findIndex(x => x.id === p.id); if (idx > 0) { const next = [...products];[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; setProducts(next); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>▲</button>
                                        <button onClick={() => { const idx = products.findIndex(x => x.id === p.id); if (idx < products.length - 1) { const next = [...products];[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; setProducts(next); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>▼</button>
                                    </div>
                                    <input type="checkbox" className="admin-datatable__card-check" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                                    {img ? <img src={img} alt={p.name} loading="lazy" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }} /> : <div style={{ width: 48, height: 48, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👓</div>}
                                    <div className="admin-datatable__card-body">
                                        <div className="admin-datatable__card-title" style={{ color: 'var(--text-primary)' }}>{p.name}</div>
                                        <div className="admin-datatable__card-subtitle">{getCategoryIcon(p.category)} {getCategoryLabel(p.category)} · {p.brand || '—'}</div>
                                        <div className="admin-datatable__card-fields">
                                            <div className="admin-datatable__card-field"><span className="admin-datatable__card-field-label">Giá</span><span className="admin-datatable__card-field-value" style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{formatVND(getMinPrice(p))}</span></div>
                                            <div className="admin-datatable__card-field"><span className="admin-datatable__card-field-label">Kho</span><span className="admin-datatable__card-field-value" style={{ color: stock === 0 ? 'var(--error)' : isLowStock ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{stock}{isLowStock && ' ⚠️'}</span></div>
                                            <div className="admin-datatable__card-field"><span className="admin-datatable__card-field-label">TT</span><span className="admin-datatable__card-field-value" style={{ color: p.status === 'ACTIVE' ? 'var(--success)' : 'var(--warning)' }}>{p.status === 'ACTIVE' ? '🟢' : '⏸️'}</span></div>
                                        </div>
                                    </div>
                                    <div className="admin-datatable__card-actions">
                                        <button className="admin-datatable__kebab" onClick={() => setOpenKebab(openKebab === p.id ? null : p.id)}>⋯</button>
                                        {openKebab === p.id && (
                                            <div className="admin-datatable__kebab-menu">
                                                <button className="admin-datatable__kebab-item" onClick={() => startEdit(p)}>✏️ Sửa nhanh</button>
                                                <Link href={`/admin/products/create?id=${p.id}`} className="admin-datatable__kebab-item" style={{ textDecoration: 'none' }}>📝 Sửa đầy đủ</Link>
                                                <Link href={`/p/${p.slug}`} target="_blank" className="admin-datatable__kebab-item" style={{ textDecoration: 'none' }}>👁️ Xem</Link>
                                                <button className="admin-datatable__kebab-item" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id, p.name)}>🗑️ Xóa</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Desktop table */}
                    <div className="admin-datatable__table-wrap">
                        <table className="admin-datatable__table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}><input type="checkbox" checked={selectedIds.size === filteredProducts.length && filteredProducts.length > 0} onChange={toggleSelectAll} /></th>
                                    <th style={{ width: 30 }} title="Sắp xếp">↕️</th>
                                    <th style={{ width: 50 }}>Ảnh</th>
                                    <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Sản phẩm <SortIcon col="name" /></th>
                                    <th>Danh mục</th>
                                    <th>Brand</th>
                                    <th>SKU</th>
                                    <th onClick={() => handleSort('price')} style={{ cursor: 'pointer' }}>Giá <SortIcon col="price" /></th>
                                    <th onClick={() => handleSort('stockQty')} style={{ cursor: 'pointer' }}>Tồn kho <SortIcon col="stockQty" /></th>
                                    <th>TT</th>
                                    <th onClick={() => handleSort('updatedAt')} style={{ cursor: 'pointer' }}>Cập nhật <SortIcon col="updatedAt" /></th>
                                    <th>⚙️</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => {
                                    const img = getMainImage(p); const stock = getTotalStock(p); const minPrice = getMinPrice(p);
                                    const maxPrice = getMaxPrice(p); const isLowStock = stock > 0 && stock <= 5; const isSelected = selectedIds.has(p.id);
                                    return (
                                        <tr key={p.id} className={isSelected ? 'admin-datatable__row--selected' : ''}>
                                            <td><input type="checkbox" checked={isSelected} onChange={() => toggleSelect(p.id)} /></td>
                                            <td style={{ fontSize: 10, whiteSpace: 'nowrap' }}>
                                                <button onClick={() => { const idx = products.findIndex(x => x.id === p.id); if (idx > 0) { const next = [...products];[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]; setProducts(next); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}>▲</button>
                                                <button onClick={() => { const idx = products.findIndex(x => x.id === p.id); if (idx < products.length - 1) { const next = [...products];[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]; setProducts(next); } }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)' }}>▼</button>
                                            </td>
                                            <td>{img ? <img src={img} alt={p.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} /> : <div style={{ width: 40, height: 40, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👓</div>}</td>
                                            <td>
                                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                                                {p.variants.length > 1 && <div style={{ fontSize: 11, color: 'var(--gold-400)' }}>{p.variants.length} biến thể</div>}
                                            </td>
                                            <td><span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>{getCategoryIcon(p.category)} {getCategoryLabel(p.category)}</span></td>
                                            <td>{p.brand || '—'}</td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.variants[0]?.sku || '—'}{p.variants.length > 1 && <div style={{ color: 'var(--text-muted)' }}>+{p.variants.length - 1}</div>}</td>
                                            <td><span style={{ fontWeight: 600, color: 'var(--gold-400)' }}>{formatVND(minPrice)}</span>{minPrice !== maxPrice && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>→ {formatVND(maxPrice)}</div>}</td>
                                            <td><span style={{ color: stock === 0 ? 'var(--error)' : isLowStock ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>{stock}</span>{isLowStock && <span style={{ fontSize: 10, marginLeft: 4 }}>⚠️</span>}</td>
                                            <td><span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: p.status === 'ACTIVE' ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)', color: p.status === 'ACTIVE' ? '#22c55e' : '#f59e0b' }}>{p.status === 'ACTIVE' ? '🟢' : '⏸️'}</span></td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(p.updatedAt).toLocaleDateString('vi-VN')}</td>
                                            <td>
                                                <div className="admin-datatable__card-actions" style={{ position: 'relative' }}>
                                                    <button className="admin-datatable__kebab" onClick={() => setOpenKebab(openKebab === p.id ? null : p.id)}>⋯</button>
                                                    {openKebab === p.id && (
                                                        <div className="admin-datatable__kebab-menu">
                                                            <button className="admin-datatable__kebab-item" onClick={() => startEdit(p)}>✏️ Sửa nhanh</button>
                                                            <Link href={`/admin/products/create?id=${p.id}`} className="admin-datatable__kebab-item" style={{ textDecoration: 'none' }}>📝 Sửa đầy đủ</Link>
                                                            <Link href={`/p/${p.slug}`} target="_blank" className="admin-datatable__kebab-item" style={{ textDecoration: 'none' }}>👁️ Xem</Link>
                                                            <button className="admin-datatable__kebab-item" style={{ color: 'var(--error)' }} onClick={() => deleteProduct(p.id, p.name)}>🗑️ Xóa</button>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
