'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';

interface Product {
    id: string; key: string; slug: string; name: string;
    tagline: string | null; description: string | null; usageGuide: string | null;
    industry: string[]; icon: string | null;
    priceOriginal: number; priceRental: number; priceSale: number;
    isActive: boolean; sortOrder: number; createdAt: string;
}

interface Category {
    id: string; name: string; slug: string; icon: string; sortOrder: number;
}

type FormData = {
    name: string; tagline: string; description: string; usageGuide: string;
    industry: string[]; icon: string;
    priceOriginal: string; priceRental: string; priceSale: string;
};

const emptyForm: FormData = {
    name: '', tagline: '', description: '', usageGuide: '',
    industry: [], icon: '📦',
    priceOriginal: '', priceRental: '', priceSale: '',
};

export default function CrmProductsPage() {
    const [tab, setTab] = useState<'products' | 'categories'>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Category form
    const [catForm, setCatForm] = useState({ name: '', icon: '📁' });
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [showCatForm, setShowCatForm] = useState(false);

    const loadProducts = useCallback(async () => {
        const res = await fetch('/api/emk-crm/products');
        if (res.ok) setProducts(await res.json());
    }, []);

    const loadCategories = useCallback(async () => {
        const res = await fetch('/api/emk-crm/categories');
        if (res.ok) setCategories(await res.json());
    }, []);

    useEffect(() => {
        Promise.all([loadProducts(), loadCategories()]).then(() => setLoading(false));
    }, [loadProducts, loadCategories]);

    // ═══ PRODUCT ACTIONS ═══
    const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (p: Product) => {
        setEditId(p.id);
        setForm({
            name: p.name, tagline: p.tagline || '', description: p.description || '',
            usageGuide: p.usageGuide || '', industry: p.industry || [], icon: p.icon || '📦',
            priceOriginal: p.priceOriginal ? String(p.priceOriginal) : '',
            priceRental: p.priceRental ? String(p.priceRental) : '',
            priceSale: p.priceSale ? String(p.priceSale) : '',
        });
        setShowForm(true);
    };

    const save = async () => {
        setSaving(true);
        const payload: Record<string, unknown> = {
            name: form.name, tagline: form.tagline || null, description: form.description || null,
            usageGuide: form.usageGuide || null, industry: form.industry, icon: form.icon,
            priceOriginal: parseInt(form.priceOriginal) || 0,
            priceRental: parseInt(form.priceRental) || 0,
            priceSale: parseInt(form.priceSale) || 0,
        };
        if (editId) payload.id = editId;

        const res = await fetch('/api/emk-crm/products', {
            method: editId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) { setShowForm(false); setEditId(null); setForm(emptyForm); loadProducts(); }
        else { const err = await res.json(); alert(err.error || 'Lỗi'); }
        setSaving(false);
    };

    const toggleActive = async (p: Product) => {
        await fetch('/api/emk-crm/products', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
        });
        loadProducts();
    };

    const remove = async (p: Product) => {
        if (!confirm(`Xoá "${p.name}"?`)) return;
        await fetch(`/api/emk-crm/products?id=${p.id}`, { method: 'DELETE' });
        loadProducts();
    };

    // ═══ CATEGORY ACTIONS ═══
    const saveCat = async () => {
        setSaving(true);
        const payload: Record<string, unknown> = { name: catForm.name, icon: catForm.icon };
        if (editCatId) payload.id = editCatId;

        const res = await fetch('/api/emk-crm/categories', {
            method: editCatId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (res.ok) { setShowCatForm(false); setEditCatId(null); setCatForm({ name: '', icon: '📁' }); loadCategories(); }
        else { const err = await res.json(); alert(err.error || 'Lỗi'); }
        setSaving(false);
    };

    const deleteCat = async (c: Category) => {
        if (!confirm(`Xoá danh mục "${c.name}"?`)) return;
        await fetch(`/api/emk-crm/categories?id=${c.id}`, { method: 'DELETE' });
        loadCategories();
    };

    const activeProducts = products.filter(p => p.isActive);
    const inactiveProducts = products.filter(p => !p.isActive);

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🛍️ Quản lý sản phẩm</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tạo, chỉnh sửa và quản lý các sản phẩm trên Marketplace
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', background: 'var(--bg-hover)', borderRadius: '12px', padding: '4px' }}>
                <button onClick={() => setTab('products')} style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    background: tab === 'products' ? 'var(--bg-card)' : 'transparent',
                    border: 'none', cursor: 'pointer', boxShadow: tab === 'products' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                    📦 Sản phẩm ({products.length})
                </button>
                <button onClick={() => setTab('categories')} style={{
                    flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                    background: tab === 'categories' ? 'var(--bg-card)' : 'transparent',
                    border: 'none', cursor: 'pointer', boxShadow: tab === 'categories' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                    🏷️ Danh mục ({categories.length})
                </button>
            </div>

            {loading && <div className="emk-skeleton" style={{ height: '120px', borderRadius: '16px' }} />}

            {/* ═══════ PRODUCTS TAB ═══════ */}
            {!loading && tab === 'products' && (
                <>
                    <button onClick={openAdd} className="emk-btn-primary" style={{
                        padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                        width: '100%', marginBottom: '16px',
                    }}>
                        + Thêm sản phẩm
                    </button>

                    {showForm && (
                        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                                {editId ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm mới'}
                            </h3>

                            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                <input placeholder="Tên sản phẩm *" value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    className="emk-input" style={{ flex: 1 }} />
                                <input placeholder="Icon" value={form.icon}
                                    onChange={e => setForm({ ...form, icon: e.target.value })}
                                    className="emk-input" style={{ width: '60px', textAlign: 'center', fontSize: '18px' }} />
                            </div>

                            <input placeholder="Mô tả ngắn" value={form.tagline}
                                onChange={e => setForm({ ...form, tagline: e.target.value })}
                                className="emk-input" style={{ width: '100%', marginBottom: '10px' }} />

                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Giá gốc</label>
                                    <input type="number" placeholder="0" value={form.priceOriginal}
                                        onChange={e => setForm({ ...form, priceOriginal: e.target.value })}
                                        className="emk-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Giá thuê/th</label>
                                    <input type="number" placeholder="0" value={form.priceRental}
                                        onChange={e => setForm({ ...form, priceRental: e.target.value })}
                                        className="emk-input" style={{ width: '100%' }} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Giá bán</label>
                                    <input type="number" placeholder="0" value={form.priceSale}
                                        onChange={e => setForm({ ...form, priceSale: e.target.value })}
                                        className="emk-input" style={{ width: '100%' }} />
                                </div>
                            </div>

                            {/* Dynamic category chips */}
                            <div style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Danh mục</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {categories.map(cat => {
                                        const active = form.industry.includes(cat.slug);
                                        return (
                                            <button key={cat.id} onClick={() => setForm({
                                                ...form, industry: active
                                                    ? form.industry.filter(i => i !== cat.slug)
                                                    : [...form.industry, cat.slug]
                                            })} style={{
                                                padding: '5px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: 600,
                                                border: '2px solid', cursor: 'pointer', transition: 'all 200ms',
                                                borderColor: active ? 'var(--accent-primary)' : 'var(--border)',
                                                background: active ? 'var(--accent-primary)' : 'transparent',
                                                color: active ? '#fff' : 'var(--text-primary)',
                                            }}>
                                                {cat.icon} {cat.name}
                                            </button>
                                        );
                                    })}
                                    {categories.length === 0 && (
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                            Chưa có danh mục. Tạo ở tab "Danh mục"
                                        </span>
                                    )}
                                </div>
                            </div>

                            <textarea placeholder="Mô tả chi tiết..." value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                className="emk-input" style={{ width: '100%', minHeight: '70px', marginBottom: '10px', resize: 'vertical' }} />

                            <textarea placeholder="Hướng dẫn sử dụng..." value={form.usageGuide}
                                onChange={e => setForm({ ...form, usageGuide: e.target.value })}
                                className="emk-input" style={{ width: '100%', minHeight: '70px', marginBottom: '12px', resize: 'vertical' }} />

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={save} disabled={saving || !form.name}
                                    className="emk-btn-primary"
                                    style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', opacity: saving || !form.name ? 0.5 : 1 }}>
                                    {saving ? '⏳...' : editId ? '✓ Cập nhật' : '✓ Tạo sản phẩm'}
                                </button>
                                <button onClick={() => { setShowForm(false); setEditId(null); }}
                                    style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px' }}>
                                    ✕ Huỷ
                                </button>
                            </div>
                        </div>
                    )}

                    {products.length === 0 ? (
                        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', marginBottom: '8px' }}>📦</p>
                            <p style={{ fontWeight: 600 }}>Chưa có sản phẩm nào</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nhấn &quot;+ Thêm sản phẩm&quot; để tạo mới</p>
                        </div>
                    ) : (
                        <>
                            {activeProducts.length > 0 && (
                                <div style={{ marginBottom: '16px' }}>
                                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        🟢 Đang hoạt động ({activeProducts.length})
                                    </h3>
                                    {activeProducts.map(p => (
                                        <ProductCard key={p.id} product={p} categories={categories}
                                            expanded={expandedId === p.id}
                                            onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                            onEdit={() => openEdit(p)} onToggleActive={() => toggleActive(p)}
                                            onDelete={() => remove(p)} />
                                    ))}
                                </div>
                            )}
                            {inactiveProducts.length > 0 && (
                                <div>
                                    <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
                                        ⚪ Đã tắt ({inactiveProducts.length})
                                    </h3>
                                    {inactiveProducts.map(p => (
                                        <ProductCard key={p.id} product={p} categories={categories}
                                            expanded={expandedId === p.id}
                                            onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                            onEdit={() => openEdit(p)} onToggleActive={() => toggleActive(p)}
                                            onDelete={() => remove(p)} />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ═══════ CATEGORIES TAB ═══════ */}
            {!loading && tab === 'categories' && (
                <>
                    <button onClick={() => { setShowCatForm(true); setEditCatId(null); setCatForm({ name: '', icon: '📁' }); }}
                        className="emk-btn-primary" style={{
                            padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px',
                            width: '100%', marginBottom: '16px',
                        }}>
                        + Thêm danh mục
                    </button>

                    {showCatForm && (
                        <div className="card" style={{ marginBottom: '16px', padding: '16px' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>
                                {editCatId ? '✏️ Sửa danh mục' : '➕ Thêm danh mục mới'}
                            </h3>
                            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                <input placeholder="Tên danh mục *" value={catForm.name}
                                    onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                                    className="emk-input" style={{ flex: 1 }} />
                                <input placeholder="Icon" value={catForm.icon}
                                    onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                                    className="emk-input" style={{ width: '60px', textAlign: 'center', fontSize: '18px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={saveCat} disabled={saving || !catForm.name}
                                    className="emk-btn-primary"
                                    style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', opacity: saving || !catForm.name ? 0.5 : 1 }}>
                                    {saving ? '⏳...' : editCatId ? '✓ Cập nhật' : '✓ Tạo danh mục'}
                                </button>
                                <button onClick={() => { setShowCatForm(false); setEditCatId(null); }}
                                    style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '13px' }}>
                                    ✕ Huỷ
                                </button>
                            </div>
                        </div>
                    )}

                    {categories.length === 0 ? (
                        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                            <p style={{ fontSize: '40px', marginBottom: '8px' }}>🏷️</p>
                            <p style={{ fontWeight: 600 }}>Chưa có danh mục nào</p>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tạo danh mục để phân loại sản phẩm</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {categories.map(c => (
                                <div key={c.id} className="card" style={{
                                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px',
                                }}>
                                    <span style={{ fontSize: '24px' }}>{c.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <strong style={{ fontSize: '14px' }}>{c.name}</strong>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>slug: {c.slug}</div>
                                    </div>
                                    <button onClick={() => { setEditCatId(c.id); setCatForm({ name: c.name, icon: c.icon }); setShowCatForm(true); }}
                                        style={{
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                            background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer'
                                        }}>
                                        ✏️
                                    </button>
                                    <button onClick={() => deleteCat(c)}
                                        style={{
                                            padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                                            background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer'
                                        }}>
                                        🗑
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ProductCard({ product: p, categories, expanded, onToggleExpand, onEdit, onToggleActive, onDelete }: {
    product: Product; categories: Category[]; expanded: boolean;
    onToggleExpand: () => void; onEdit: () => void; onToggleActive: () => void; onDelete: () => void;
}) {
    const getCatLabel = (slug: string) => {
        const cat = categories.find(c => c.slug === slug);
        return cat ? `${cat.icon} ${cat.name}` : slug;
    };

    return (
        <div className="card" style={{
            padding: '14px', marginBottom: '8px', opacity: p.isActive ? 1 : 0.6,
            borderLeft: `4px solid ${p.isActive ? 'var(--accent-primary)' : 'var(--border)'}`,
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={onToggleExpand}>
                <span style={{ fontSize: '26px' }}>{p.icon || '📦'}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ fontSize: '15px' }}>{p.name}</strong>
                        {!p.isActive && <span style={{ fontSize: '9px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '6px', color: '#999' }}>TẮT</span>}
                    </div>
                    {p.tagline && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{p.tagline}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {p.priceRental > 0 && <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-primary)' }}>{vnd(p.priceRental)}/th</div>}
                    {p.priceSale > 0 && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bán: {vnd(p.priceSale)}</div>}
                    {p.priceOriginal > 0 && p.priceOriginal !== p.priceSale && (
                        <div style={{ fontSize: '10px', color: '#999', textDecoration: 'line-through' }}>{vnd(p.priceOriginal)}</div>
                    )}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>

            {p.industry.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {p.industry.map(ind => (
                        <span key={ind} style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>
                            {getCatLabel(ind)}
                        </span>
                    ))}
                </div>
            )}

            {expanded && (
                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border)', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                        <PriceTag label="Giá gốc" value={p.priceOriginal} />
                        <PriceTag label="Giá thuê/tháng" value={p.priceRental} accent />
                        <PriceTag label="Giá bán" value={p.priceSale} />
                    </div>

                    {p.description && (
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>📝 Mô tả chi tiết</label>
                            <p style={{ fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '4px' }}>{p.description}</p>
                        </div>
                    )}
                    {p.usageGuide && (
                        <div style={{ marginBottom: '10px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>📘 Hướng dẫn sử dụng</label>
                            <p style={{ fontSize: '12px', lineHeight: 1.6, whiteSpace: 'pre-wrap', marginTop: '4px' }}>{p.usageGuide}</p>
                        </div>
                    )}

                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                        Key: <code style={{ background: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>{p.key}</code>
                        &nbsp;·&nbsp;Slug: <code style={{ background: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>{p.slug}</code>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={onEdit} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>✏️ Sửa</button>
                        <button onClick={onToggleActive} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: p.isActive ? '#fef3c7' : '#d1fae5', color: p.isActive ? '#92400e' : '#065f46', border: 'none', cursor: 'pointer' }}>
                            {p.isActive ? '⏸ Tắt' : '▶ Bật'}
                        </button>
                        <button onClick={onDelete} style={{ padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>🗑 Xoá</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PriceTag({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div style={{ padding: '6px 12px', borderRadius: '8px', background: accent ? 'rgba(99,102,241,0.1)' : 'var(--bg-hover)' }}>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: accent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {value > 0 ? vnd(value) : '—'}
            </div>
        </div>
    );
}
