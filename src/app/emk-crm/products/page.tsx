'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';

/* ═══ TYPES ═══ */
interface Product {
    id: string; key: string; slug: string; name: string;
    type: string; billingModel: string; deliveryMethod: string; status: string;
    tagline: string | null; description: string | null; usageGuide: string | null;
    thumbnail: string | null; industry: string[]; icon: string | null;
    priceOriginal: number; priceRental: number; priceSale: number;
    isActive: boolean; sortOrder: number; createdAt: string;
    meteredItems: MeteredItem[]; digitalAssets: DigitalAsset[];
}
interface MeteredItem { id: string; productId: string; key: string; unitName: string; unitPrice: number; isActive: boolean; }
interface DigitalAsset { id: string; productId: string; fileKey: string; filename: string; size: number; version: string; isActive: boolean; }
interface Category { id: string; name: string; slug: string; icon: string; }

type Tab = 'products' | 'categories';

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
    CRM: { label: 'CRM', icon: '🏢', color: '#6366f1' },
    APP: { label: 'App', icon: '📱', color: '#f59e0b' },
    DIGITAL: { label: 'Sản Phẩm Số', icon: '📥', color: '#10b981' },
};
const BILLING_META: Record<string, string> = { SUBSCRIPTION: 'Thuê bao', PAYG: 'Trả/lượt', ONE_TIME: '1 lần', MIXED: 'Kết hợp' };
const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    DRAFT: { label: 'Nháp', color: '#6b7280', bg: '#f3f4f6' },
    PUBLISHED: { label: 'Công bố', color: '#059669', bg: '#d1fae5' },
    ARCHIVED: { label: 'Lưu trữ', color: '#92400e', bg: '#fef3c7' },
};

/* ═══ FORM ═══ */
type FormData = {
    name: string; type: string; billingModel: string; tagline: string;
    description: string; usageGuide: string; industry: string[];
    icon: string; priceOriginal: string; priceRental: string; priceSale: string;
};

const emptyForm: FormData = {
    name: '', type: 'CRM', billingModel: 'SUBSCRIPTION', tagline: '',
    description: '', usageGuide: '', industry: [], icon: '📦',
    priceOriginal: '', priceRental: '', priceSale: '',
};

export default function CrmProductsPage() {
    const [tab, setTab] = useState<Tab>('products');
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('ALL');

    // Category state
    const [catForm, setCatForm] = useState({ name: '', icon: '📁' });
    const [editCatId, setEditCatId] = useState<string | null>(null);
    const [showCatForm, setShowCatForm] = useState(false);

    // Metered item state
    const [meterForm, setMeterForm] = useState({ key: '', unitName: 'lượt', unitPrice: '' });
    const [showMeterForm, setShowMeterForm] = useState<string | null>(null);

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

    /* ═══ Product CRUD ═══ */
    const openAdd = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
    const openEdit = (p: Product) => {
        setEditId(p.id);
        setForm({
            name: p.name, type: p.type, billingModel: p.billingModel,
            tagline: p.tagline || '', description: p.description || '',
            usageGuide: p.usageGuide || '', industry: p.industry || [],
            icon: p.icon || '📦',
            priceOriginal: p.priceOriginal ? String(p.priceOriginal) : '',
            priceRental: p.priceRental ? String(p.priceRental) : '',
            priceSale: p.priceSale ? String(p.priceSale) : '',
        });
        setShowForm(true);
    };

    const save = async () => {
        setSaving(true);
        const payload: Record<string, unknown> = {
            name: form.name, type: form.type, billingModel: form.billingModel,
            tagline: form.tagline || null, description: form.description || null,
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
        if (res.ok) { setShowForm(false); setEditId(null); loadProducts(); }
        else { const e = await res.json(); alert(e.error || 'Lỗi'); }
        setSaving(false);
    };

    const setStatus = async (id: string, status: string) => {
        await fetch('/api/emk-crm/products', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status }),
        });
        loadProducts();
    };

    const deleteProduct = async (p: Product) => {
        if (!confirm(`Xoá "${p.name}"?`)) return;
        await fetch(`/api/emk-crm/products?id=${p.id}`, { method: 'DELETE' });
        loadProducts();
    };

    /* ═══ Metered Item CRUD ═══ */
    const saveMeter = async (productId: string) => {
        const res = await fetch('/api/emk-crm/metered-items', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId, key: meterForm.key, unitName: meterForm.unitName, unitPrice: parseInt(meterForm.unitPrice) || 0 }),
        });
        if (res.ok) { setShowMeterForm(null); setMeterForm({ key: '', unitName: 'lượt', unitPrice: '' }); loadProducts(); }
        else { const e = await res.json(); alert(e.error); }
    };
    const deleteMeter = async (id: string) => {
        await fetch(`/api/emk-crm/metered-items?id=${id}`, { method: 'DELETE' });
        loadProducts();
    };

    /* ═══ Category CRUD ═══ */
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
        else { const e = await res.json(); alert(e.error); }
        setSaving(false);
    };
    const deleteCat = async (c: Category) => {
        if (!confirm(`Xoá "${c.name}"?`)) return;
        await fetch(`/api/emk-crm/categories?id=${c.id}`, { method: 'DELETE' });
        loadCategories();
    };

    const filtered = filterType === 'ALL' ? products : products.filter(p => p.type === filterType);

    return (
        <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>🛍️ Quản lý sản phẩm</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                CRM · App · Sản phẩm số — Commerce Layer
            </p>

            {/* Tab bar */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', background: 'var(--bg-hover)', borderRadius: '12px', padding: '3px' }}>
                {[
                    { key: 'products' as Tab, label: `📦 Sản phẩm (${products.length})` },
                    { key: 'categories' as Tab, label: `🏷️ Danh mục (${categories.length})` },
                ].map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)} style={{
                        flex: 1, padding: '9px', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                        background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                        border: 'none', cursor: 'pointer',
                        boxShadow: tab === t.key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    }}>{t.label}</button>
                ))}
            </div>

            {loading && <div className="emk-skeleton" style={{ height: '100px', borderRadius: '12px' }} />}

            {/* ═══ PRODUCTS TAB ═══ */}
            {!loading && tab === 'products' && (
                <>
                    {/* Type filter chips */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {[{ key: 'ALL', label: 'Tất cả' }, ...Object.entries(TYPE_META).map(([k, v]) => ({ key: k, label: `${v.icon} ${v.label}` }))].map(f => (
                            <button key={f.key} onClick={() => setFilterType(f.key)} style={{
                                padding: '5px 12px', borderRadius: '14px', fontSize: '11px', fontWeight: 700,
                                border: '2px solid', cursor: 'pointer',
                                borderColor: filterType === f.key ? 'var(--accent-primary)' : 'var(--border)',
                                background: filterType === f.key ? 'var(--accent-primary)' : 'transparent',
                                color: filterType === f.key ? '#fff' : 'var(--text-primary)',
                            }}>{f.label}</button>
                        ))}
                    </div>

                    <button onClick={openAdd} className="emk-btn-primary" style={{ padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', width: '100%', marginBottom: '12px' }}>
                        + Thêm sản phẩm
                    </button>

                    {/* Product Form — Full-screen overlay */}
                    {showForm && (
                        <>
                            {/* Scoped animation */}
                            <style>{`
                                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                                .pf-overlay { position: fixed; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 40px 16px; }
                                .pf-modal { width: 100%; max-width: 580px; background: var(--bg-card); border-radius: 24px; border: 1px solid var(--border); box-shadow: 0 24px 80px rgba(0,0,0,0.25); animation: slideUp 0.3s ease-out; }
                                .pf-section { padding: 20px 24px; border-bottom: 1px solid var(--border); }
                                .pf-section:last-child { border-bottom: none; }
                                .pf-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; letter-spacing: 0.3px; }
                                .pf-input { width: 100%; padding: 12px 16px; border-radius: 12px; background: var(--bg-primary); border: 1.5px solid var(--border); color: var(--text-primary); font-size: 14px; font-family: inherit; outline: none; box-sizing: border-box; transition: border-color 0.2s, box-shadow 0.2s; }
                                .pf-input:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
                                .pf-input::placeholder { color: var(--text-muted); }
                                .pf-textarea { width: 100%; padding: 12px 16px; border-radius: 12px; background: var(--bg-primary); border: 1.5px solid var(--border); color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; box-sizing: border-box; min-height: 80px; resize: vertical; transition: border-color 0.2s, box-shadow 0.2s; }
                                .pf-textarea:focus { border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
                                .pf-type-btn { flex: 1; padding: 14px 8px; border-radius: 14px; border: 2px solid var(--border); background: transparent; cursor: pointer; text-align: center; transition: all 0.2s ease; font-family: inherit; }
                                .pf-type-btn:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
                                .pf-billing-btn { flex: 1; padding: 10px 6px; border-radius: 10px; border: 1.5px solid var(--border); background: transparent; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s ease; font-family: inherit; color: var(--text-muted); }
                                @media (max-width: 768px) { .pf-overlay { padding: 16px 8px; } .pf-section { padding: 16px; } }
                            `}</style>
                            <div className="pf-overlay" onClick={() => { setShowForm(false); setEditId(null); }}>
                                <div className="pf-modal" onClick={e => e.stopPropagation()}>
                                    {/* Modal Header */}
                                    <div className="pf-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div>
                                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {editId ? '✏️' : '✨'} {editId ? 'Sửa sản phẩm' : 'Tạo sản phẩm mới'}
                                            </h2>
                                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                                                {editId ? 'Cập nhật thông tin sản phẩm' : 'Thêm sản phẩm mới vào hệ thống'}
                                            </p>
                                        </div>
                                        <button onClick={() => { setShowForm(false); setEditId(null); }} style={{
                                            width: '36px', height: '36px', borderRadius: '10px',
                                            background: 'var(--bg-primary)', border: '1px solid var(--border)',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px', color: 'var(--text-muted)', transition: 'all 0.15s ease',
                                        }}>✕</button>
                                    </div>

                                    {/* Section 1: Product Type */}
                                    <div className="pf-section">
                                        <label className="pf-label">Loại sản phẩm</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            {Object.entries(TYPE_META).map(([k, v]) => {
                                                const isActive = form.type === k;
                                                return (
                                                    <button key={k} className="pf-type-btn" onClick={() => {
                                                        const billing = k === 'APP' ? 'PAYG' : k === 'DIGITAL' ? 'ONE_TIME' : 'SUBSCRIPTION';
                                                        setForm({ ...form, type: k, billingModel: billing });
                                                    }} style={{
                                                        borderColor: isActive ? v.color : undefined,
                                                        background: isActive ? `${v.color}12` : undefined,
                                                        transform: isActive ? 'translateY(-2px)' : undefined,
                                                        boxShadow: isActive ? `0 4px 16px ${v.color}30` : undefined,
                                                    }}>
                                                        <div style={{ fontSize: '28px', marginBottom: '6px' }}>{v.icon}</div>
                                                        <div style={{ fontSize: '13px', fontWeight: 700, color: isActive ? v.color : 'var(--text-primary)' }}>{v.label}</div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Section 2: Basic Info */}
                                    <div className="pf-section">
                                        <label className="pf-label">Thông tin cơ bản</label>
                                        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{
                                                width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
                                                background: 'var(--bg-primary)', border: '1.5px solid var(--border)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                position: 'relative', overflow: 'hidden',
                                            }}>
                                                <span style={{ fontSize: '28px' }}>{form.icon || '📦'}</span>
                                                <input value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                                                    style={{
                                                        position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer',
                                                        fontSize: '28px', textAlign: 'center',
                                                    }} title="Nhấn để đổi icon" />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <input className="pf-input" placeholder="Tên sản phẩm *"
                                                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                                                    autoFocus style={{ marginBottom: '8px', fontWeight: 600, fontSize: '16px' }} />
                                                <input className="pf-input" placeholder="Mô tả ngắn (VD: CRM quản lý spa thông minh)"
                                                    value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Billing & Pricing */}
                                    <div className="pf-section">
                                        <label className="pf-label">Mô hình tính phí & Giá</label>
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
                                            {Object.entries(BILLING_META).map(([k, label]) => {
                                                const isActive = form.billingModel === k;
                                                return (
                                                    <button key={k} className="pf-billing-btn" onClick={() => setForm({ ...form, billingModel: k })} style={{
                                                        borderColor: isActive ? 'var(--accent-primary)' : undefined,
                                                        background: isActive ? 'rgba(99,102,241,0.08)' : undefined,
                                                        color: isActive ? 'var(--accent-primary)' : undefined,
                                                        fontWeight: isActive ? 700 : undefined,
                                                    }}>{label}</button>
                                                );
                                            })}
                                        </div>

                                        {form.billingModel === 'PAYG' ? (
                                            <div style={{
                                                padding: '14px 16px', borderRadius: '12px',
                                                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)',
                                                fontSize: '13px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px',
                                            }}>
                                                <span style={{ fontSize: '18px' }}>💡</span>
                                                <span>Giá PAYG: tạo sản phẩm trước, sau đó thêm đơn vị tính phí ở phần chi tiết.</span>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'grid', gridTemplateColumns: form.billingModel === 'SUBSCRIPTION' || form.billingModel === 'MIXED' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '10px' }}>
                                                <div>
                                                    <label className="pf-label" style={{ fontSize: '11px' }}>Giá gốc (VND)</label>
                                                    <input className="pf-input" type="number" placeholder="0"
                                                        value={form.priceOriginal} onChange={e => setForm({ ...form, priceOriginal: e.target.value })} />
                                                </div>
                                                {(form.billingModel === 'SUBSCRIPTION' || form.billingModel === 'MIXED') && (
                                                    <div>
                                                        <label className="pf-label" style={{ fontSize: '11px' }}>Thuê/tháng (VND)</label>
                                                        <input className="pf-input" type="number" placeholder="0"
                                                            value={form.priceRental} onChange={e => setForm({ ...form, priceRental: e.target.value })} />
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="pf-label" style={{ fontSize: '11px' }}>Giá bán (VND)</label>
                                                    <input className="pf-input" type="number" placeholder="0"
                                                        value={form.priceSale} onChange={e => setForm({ ...form, priceSale: e.target.value })} />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Section 4: Categories & Details */}
                                    <div className="pf-section">
                                        {categories.length > 0 && (
                                            <div style={{ marginBottom: '16px' }}>
                                                <label className="pf-label">Danh mục</label>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    {categories.map(c => {
                                                        const a = form.industry.includes(c.slug);
                                                        return (
                                                            <button key={c.id} onClick={() => setForm({
                                                                ...form, industry: a ? form.industry.filter(i => i !== c.slug) : [...form.industry, c.slug]
                                                            })} style={{
                                                                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                                                border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s ease',
                                                                fontFamily: 'inherit',
                                                                borderColor: a ? 'var(--accent-primary)' : 'var(--border)',
                                                                background: a ? 'var(--accent-primary)' : 'transparent',
                                                                color: a ? '#fff' : 'var(--text-secondary)',
                                                            }}>{c.icon} {c.name}</button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginBottom: '12px' }}>
                                            <label className="pf-label">Mô tả chi tiết</label>
                                            <textarea className="pf-textarea" placeholder="Mô tả đầy đủ về sản phẩm, tính năng nổi bật..."
                                                value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                        </div>

                                        <div>
                                            <label className="pf-label">Hướng dẫn sử dụng</label>
                                            <textarea className="pf-textarea" placeholder="Các bước để bắt đầu sử dụng sản phẩm..."
                                                value={form.usageGuide} onChange={e => setForm({ ...form, usageGuide: e.target.value })} />
                                        </div>
                                    </div>

                                    {/* Section 5: Actions */}
                                    <div className="pf-section" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                        <button onClick={() => { setShowForm(false); setEditId(null); }} style={{
                                            padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                                            background: 'var(--bg-primary)', border: '1.5px solid var(--border)',
                                            cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit',
                                            transition: 'all 0.15s ease',
                                        }}>Huỷ</button>
                                        <button onClick={save} disabled={saving || !form.name} style={{
                                            padding: '12px 32px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                            background: saving || !form.name ? 'var(--bg-hover)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                            color: saving || !form.name ? 'var(--text-muted)' : '#fff',
                                            border: 'none', cursor: saving || !form.name ? 'not-allowed' : 'pointer',
                                            fontFamily: 'inherit', transition: 'all 0.2s ease',
                                            boxShadow: saving || !form.name ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                                        }}>
                                            {saving ? '⏳ Đang lưu...' : editId ? '✓ Cập nhật' : '✓ Tạo sản phẩm'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Product list */}
                    {filtered.length === 0 ? (
                        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>📦</p>
                            <p style={{ fontWeight: 600, fontSize: '14px' }}>Chưa có sản phẩm{filterType !== 'ALL' ? ` loại ${TYPE_META[filterType]?.label}` : ''}</p>
                        </div>
                    ) : (
                        filtered.map(p => (
                            <ProductCard key={p.id} product={p} categories={categories}
                                expanded={expandedId === p.id}
                                showMeterForm={showMeterForm === p.id}
                                meterForm={meterForm}
                                onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                onEdit={() => openEdit(p)}
                                onSetStatus={(s) => setStatus(p.id, s)}
                                onDelete={() => deleteProduct(p)}
                                onShowMeterForm={() => { setShowMeterForm(p.id); setMeterForm({ key: '', unitName: 'lượt', unitPrice: '' }); }}
                                onMeterFormChange={setMeterForm}
                                onSaveMeter={() => saveMeter(p.id)}
                                onDeleteMeter={deleteMeter}
                                onCloseMeterForm={() => setShowMeterForm(null)}
                            />
                        ))
                    )}
                </>
            )}

            {/* ═══ CATEGORIES TAB ═══ */}
            {!loading && tab === 'categories' && (
                <>
                    <button onClick={() => { setShowCatForm(true); setEditCatId(null); setCatForm({ name: '', icon: '📁' }); }}
                        className="emk-btn-primary" style={{ padding: '10px', borderRadius: '12px', fontWeight: 700, fontSize: '13px', width: '100%', marginBottom: '12px' }}>
                        + Thêm danh mục
                    </button>

                    {showCatForm && (
                        <div className="card" style={{ marginBottom: '12px', padding: '14px' }}>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                                <input placeholder="Tên danh mục *" value={catForm.name}
                                    onChange={e => setCatForm({ ...catForm, name: e.target.value })}
                                    className="emk-input" style={{ flex: 1 }} />
                                <input placeholder="Icon" value={catForm.icon}
                                    onChange={e => setCatForm({ ...catForm, icon: e.target.value })}
                                    className="emk-input" style={{ width: '50px', textAlign: 'center', fontSize: '16px' }} />
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={saveCat} disabled={!catForm.name} className="emk-btn-primary"
                                    style={{ padding: '9px 18px', borderRadius: '10px', fontWeight: 700, fontSize: '12px' }}>
                                    {editCatId ? '✓ Cập nhật' : '✓ Tạo'}
                                </button>
                                <button onClick={() => setShowCatForm(false)}
                                    style={{ padding: '9px 14px', borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '12px' }}>
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {categories.length === 0 ? (
                        <div className="card" style={{ padding: '30px', textAlign: 'center' }}>
                            <p style={{ fontSize: '32px', marginBottom: '8px' }}>🏷️</p>
                            <p style={{ fontWeight: 600 }}>Chưa có danh mục</p>
                        </div>
                    ) : categories.map(c => (
                        <div key={c.id} className="card" style={{ padding: '12px 14px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '22px' }}>{c.icon}</span>
                            <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: '13px' }}>{c.name}</strong>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{c.slug}</div>
                            </div>
                            <button onClick={() => { setEditCatId(c.id); setCatForm({ name: c.name, icon: c.icon }); setShowCatForm(true); }}
                                style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>✏️</button>
                            <button onClick={() => deleteCat(c)}
                                style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '11px', background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>🗑</button>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

/* ═══ PRODUCT CARD ═══ */
function ProductCard({ product: p, categories, expanded, showMeterForm, meterForm, onToggleExpand, onEdit, onSetStatus, onDelete, onShowMeterForm, onMeterFormChange, onSaveMeter, onDeleteMeter, onCloseMeterForm }: {
    product: Product; categories: Category[]; expanded: boolean;
    showMeterForm: boolean; meterForm: { key: string; unitName: string; unitPrice: string };
    onToggleExpand: () => void; onEdit: () => void;
    onSetStatus: (s: string) => void; onDelete: () => void;
    onShowMeterForm: () => void;
    onMeterFormChange: (f: { key: string; unitName: string; unitPrice: string }) => void;
    onSaveMeter: () => void; onDeleteMeter: (id: string) => void; onCloseMeterForm: () => void;
}) {
    const tm = TYPE_META[p.type] || TYPE_META.CRM;
    const sm = STATUS_META[p.status] || STATUS_META.DRAFT;
    const getCat = (slug: string) => { const c = categories.find(x => x.slug === slug); return c ? `${c.icon} ${c.name}` : slug; };

    return (
        <div className="card" style={{ padding: '12px', marginBottom: '8px', borderLeft: `4px solid ${tm.color}` }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={onToggleExpand}>
                <span style={{ fontSize: '24px' }}>{p.icon || '📦'}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '14px' }}>{p.name}</strong>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: tm.color, color: '#fff' }}>{tm.icon} {tm.label}</span>
                        <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: sm.bg, color: sm.color }}>{sm.label}</span>
                    </div>
                    {p.tagline && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{p.tagline}</p>}
                </div>
                <div style={{ textAlign: 'right', minWidth: '70px' }}>
                    {p.priceRental > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: tm.color }}>{vnd(p.priceRental)}/th</div>}
                    {p.priceSale > 0 && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{vnd(p.priceSale)}</div>}
                    {p.billingModel === 'PAYG' && <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>PAYG</div>}
                </div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▼</span>
            </div>

            {/* Tags */}
            {p.industry.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                    {p.industry.map(i => <span key={i} style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '8px', background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>{getCat(i)}</span>)}
                </div>
            )}

            {/* Expanded details */}
            {expanded && (
                <div style={{ marginTop: '10px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                    {/* Info */}
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Billing: <strong>{BILLING_META[p.billingModel]}</strong> · Delivery: <strong>{p.deliveryMethod}</strong> · Key: <code style={{ background: 'var(--bg-hover)', padding: '1px 4px', borderRadius: '3px' }}>{p.key}</code>
                    </div>

                    {/* Prices */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        {p.priceOriginal > 0 && <PriceChip label="Gốc" value={p.priceOriginal} />}
                        {p.priceRental > 0 && <PriceChip label="Thuê/th" value={p.priceRental} accent />}
                        {p.priceSale > 0 && <PriceChip label="Bán" value={p.priceSale} />}
                    </div>

                    {/* Description */}
                    {p.description && <p style={{ fontSize: '11px', lineHeight: 1.5, whiteSpace: 'pre-wrap', marginBottom: '8px', color: 'var(--text-secondary)' }}>{p.description}</p>}

                    {/* Metered Items (PAYG) */}
                    {(p.billingModel === 'PAYG' || p.billingModel === 'MIXED') && (
                        <div style={{ marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                                <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>⚡ Đơn vị tính (PAYG)</label>
                                <button onClick={onShowMeterForm} style={{ fontSize: '10px', color: 'var(--accent-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>+ Thêm</button>
                            </div>
                            {p.meteredItems.map(m => (
                                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '4px', fontSize: '11px' }}>
                                    <code style={{ fontWeight: 700 }}>{m.key}</code>
                                    <span style={{ flex: 1 }}>{m.unitName}: <strong style={{ color: '#f59e0b' }}>{vnd(m.unitPrice)}</strong></span>
                                    <button onClick={() => onDeleteMeter(m.id)} style={{ fontSize: '10px', color: '#991b1b', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                                </div>
                            ))}
                            {showMeterForm && (
                                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                                    <input placeholder="KEY" value={meterForm.key}
                                        onChange={e => onMeterFormChange({ ...meterForm, key: e.target.value })}
                                        className="emk-input" style={{ width: '80px', fontSize: '10px' }} />
                                    <input placeholder="Đơn vị" value={meterForm.unitName}
                                        onChange={e => onMeterFormChange({ ...meterForm, unitName: e.target.value })}
                                        className="emk-input" style={{ width: '60px', fontSize: '10px' }} />
                                    <input placeholder="Giá" type="number" value={meterForm.unitPrice}
                                        onChange={e => onMeterFormChange({ ...meterForm, unitPrice: e.target.value })}
                                        className="emk-input" style={{ width: '70px', fontSize: '10px' }} />
                                    <button onClick={onSaveMeter} className="emk-btn-primary" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700 }}>✓</button>
                                    <button onClick={onCloseMeterForm} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '10px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>✕</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Digital Assets (DIGITAL) */}
                    {p.type === 'DIGITAL' && (
                        <div style={{ marginBottom: '8px' }}>
                            <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)' }}>📥 Tài sản số</label>
                            {p.digitalAssets.length === 0 ? (
                                <p style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Chưa có file. Upload qua API.</p>
                            ) : p.digitalAssets.map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '4px', fontSize: '11px' }}>
                                    <span>📄</span>
                                    <span style={{ flex: 1 }}>{a.filename} <span style={{ color: 'var(--text-muted)' }}>v{a.version}</span></span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '9px' }}>{(a.size / 1024).toFixed(0)}KB</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button onClick={onEdit} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer' }}>✏️ Sửa</button>
                        {p.status === 'DRAFT' && <button onClick={() => onSetStatus('PUBLISHED')} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#d1fae5', color: '#065f46', border: 'none', cursor: 'pointer' }}>🚀 Công bố</button>}
                        {p.status === 'PUBLISHED' && <button onClick={() => onSetStatus('ARCHIVED')} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#fef3c7', color: '#92400e', border: 'none', cursor: 'pointer' }}>📦 Lưu trữ</button>}
                        {p.status === 'ARCHIVED' && <button onClick={() => onSetStatus('DRAFT')} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#e0e7ff', color: '#3730a3', border: 'none', cursor: 'pointer' }}>📝 Mở lại</button>}
                        <button onClick={onDelete} style={{ padding: '6px 12px', borderRadius: '7px', fontSize: '11px', fontWeight: 600, background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer' }}>🗑 Xoá</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PriceChip({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div style={{ padding: '4px 10px', borderRadius: '7px', background: accent ? 'rgba(99,102,241,0.1)' : 'var(--bg-hover)' }}>
            <div style={{ fontSize: '8px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: accent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {vnd(value)}
            </div>
        </div>
    );
}
