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

const INDUSTRIES = [
    { value: 'SPA', label: 'Spa & Salon' },
    { value: 'SALES', label: 'Bán hàng' },
    { value: 'PERSONAL', label: 'Cá nhân' },
    { value: 'FNBR', label: 'F&B' },
    { value: 'EDUCATION', label: 'Giáo dục' },
];

export default function CrmProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const res = await fetch('/api/emk-crm/products');
        if (res.ok) setProducts(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => {
        setEditId(null);
        setForm(emptyForm);
        setShowForm(true);
    };

    const openEdit = (p: Product) => {
        setEditId(p.id);
        setForm({
            name: p.name,
            tagline: p.tagline || '',
            description: p.description || '',
            usageGuide: p.usageGuide || '',
            industry: p.industry || [],
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
            name: form.name,
            tagline: form.tagline || null,
            description: form.description || null,
            usageGuide: form.usageGuide || null,
            industry: form.industry,
            icon: form.icon,
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

        if (res.ok) {
            setShowForm(false);
            setEditId(null);
            setForm(emptyForm);
            load();
        } else {
            const err = await res.json();
            alert(err.error || 'Lỗi');
        }
        setSaving(false);
    };

    const toggleActive = async (p: Product) => {
        await fetch('/api/emk-crm/products', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: p.id, isActive: !p.isActive }),
        });
        load();
    };

    const remove = async (p: Product) => {
        if (!confirm(`Xoá "${p.name}"?`)) return;
        await fetch(`/api/emk-crm/products?id=${p.id}`, { method: 'DELETE' });
        load();
    };

    const activeProducts = products.filter(p => p.isActive);
    const inactiveProducts = products.filter(p => !p.isActive);

    return (
        <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>🛍️ Quản lý giải pháp</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Tạo, chỉnh sửa và quản lý các giải pháp trên Marketplace
                    </p>
                </div>
                <button onClick={openAdd} className="emk-btn-primary" style={{ padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px' }}>
                    + Thêm giải pháp
                </button>
            </div>

            {/* ═══ FORM ═══ */}
            {showForm && (
                <div className="card" style={{ marginBottom: '20px', padding: '20px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                        {editId ? '✏️ Sửa giải pháp' : '➕ Thêm giải pháp mới'}
                    </h3>

                    {/* Row 1: Name + Icon */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <input
                            placeholder="Tên giải pháp *"
                            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                            className="emk-input" style={{ flex: 1 }}
                        />
                        <input
                            placeholder="Icon (emoji)"
                            value={form.icon} onChange={e => setForm({ ...form, icon: e.target.value })}
                            className="emk-input" style={{ width: '80px', textAlign: 'center', fontSize: '20px' }}
                        />
                    </div>

                    {/* Row 2: Tagline */}
                    <input
                        placeholder="Mô tả ngắn (1 dòng)"
                        value={form.tagline} onChange={e => setForm({ ...form, tagline: e.target.value })}
                        className="emk-input" style={{ width: '100%', marginBottom: '12px' }}
                    />

                    {/* Row 3: Prices */}
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Giá gốc (VND)</label>
                            <input
                                type="number" placeholder="0"
                                value={form.priceOriginal} onChange={e => setForm({ ...form, priceOriginal: e.target.value })}
                                className="emk-input" style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Giá thuê/tháng</label>
                            <input
                                type="number" placeholder="0"
                                value={form.priceRental} onChange={e => setForm({ ...form, priceRental: e.target.value })}
                                className="emk-input" style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>Giá bán</label>
                            <input
                                type="number" placeholder="0"
                                value={form.priceSale} onChange={e => setForm({ ...form, priceSale: e.target.value })}
                                className="emk-input" style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    {/* Row 4: Industry chips */}
                    <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>Danh mục ngành</label>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {INDUSTRIES.map(ind => {
                                const active = form.industry.includes(ind.value);
                                return (
                                    <button
                                        key={ind.value}
                                        onClick={() => setForm({
                                            ...form,
                                            industry: active
                                                ? form.industry.filter(i => i !== ind.value)
                                                : [...form.industry, ind.value]
                                        })}
                                        style={{
                                            padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                                            border: '2px solid',
                                            borderColor: active ? 'var(--accent-primary)' : 'var(--border)',
                                            background: active ? 'var(--accent-primary)' : 'transparent',
                                            color: active ? '#fff' : 'var(--text-primary)',
                                            cursor: 'pointer', transition: 'all 200ms',
                                        }}
                                    >
                                        {ind.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Row 5: Description */}
                    <textarea
                        placeholder="Mô tả chi tiết..."
                        value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                        className="emk-input" style={{ width: '100%', minHeight: '80px', marginBottom: '12px', resize: 'vertical' }}
                    />

                    {/* Row 6: Usage guide */}
                    <textarea
                        placeholder="Hướng dẫn sử dụng..."
                        value={form.usageGuide} onChange={e => setForm({ ...form, usageGuide: e.target.value })}
                        className="emk-input" style={{ width: '100%', minHeight: '80px', marginBottom: '16px', resize: 'vertical' }}
                    />

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={save} disabled={saving || !form.name}
                            className="emk-btn-primary"
                            style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', opacity: saving || !form.name ? 0.5 : 1 }}
                        >
                            {saving ? '⏳ Đang lưu...' : editId ? '✓ Cập nhật' : '✓ Tạo giải pháp'}
                        </button>
                        <button
                            onClick={() => { setShowForm(false); setEditId(null); }}
                            style={{ padding: '10px 20px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', cursor: 'pointer', fontSize: '14px' }}
                        >
                            ✕ Huỷ
                        </button>
                    </div>
                </div>
            )}

            {/* ═══ PRODUCT LIST ═══ */}
            {loading ? (
                <div className="emk-skeleton" style={{ height: '120px', borderRadius: '16px' }} />
            ) : products.length === 0 ? (
                <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                    <p style={{ fontSize: '40px', marginBottom: '12px' }}>📦</p>
                    <p style={{ fontWeight: 600, fontSize: '16px' }}>Chưa có giải pháp nào</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Nhấn "+ Thêm giải pháp" để tạo mới</p>
                </div>
            ) : (
                <>
                    {/* Active */}
                    {activeProducts.length > 0 && (
                        <div style={{ marginBottom: '20px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                🟢 Đang hoạt động ({activeProducts.length})
                            </h3>
                            {activeProducts.map(p => (
                                <ProductCard key={p.id} product={p}
                                    expanded={expandedId === p.id}
                                    onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                    onEdit={() => openEdit(p)}
                                    onToggleActive={() => toggleActive(p)}
                                    onDelete={() => remove(p)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Inactive */}
                    {inactiveProducts.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px' }}>
                                ⚪ Đã tắt ({inactiveProducts.length})
                            </h3>
                            {inactiveProducts.map(p => (
                                <ProductCard key={p.id} product={p}
                                    expanded={expandedId === p.id}
                                    onToggleExpand={() => setExpandedId(expandedId === p.id ? null : p.id)}
                                    onEdit={() => openEdit(p)}
                                    onToggleActive={() => toggleActive(p)}
                                    onDelete={() => remove(p)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function ProductCard({ product: p, expanded, onToggleExpand, onEdit, onToggleActive, onDelete }: {
    product: Product; expanded: boolean;
    onToggleExpand: () => void; onEdit: () => void;
    onToggleActive: () => void; onDelete: () => void;
}) {
    return (
        <div className="card" style={{
            padding: '16px', marginBottom: '10px',
            opacity: p.isActive ? 1 : 0.6,
            borderLeft: `4px solid ${p.isActive ? 'var(--accent-primary)' : 'var(--border)'}`,
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={onToggleExpand}>
                <span style={{ fontSize: '28px' }}>{p.icon || '📦'}</span>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ fontSize: '16px' }}>{p.name}</strong>
                        {!p.isActive && <span style={{ fontSize: '10px', background: '#f3f4f6', padding: '2px 8px', borderRadius: '8px', color: '#999' }}>TẮT</span>}
                    </div>
                    {p.tagline && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>{p.tagline}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                    {p.priceRental > 0 && <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent-primary)' }}>{vnd(p.priceRental)}/th</div>}
                    {p.priceSale > 0 && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Bán: {vnd(p.priceSale)}</div>}
                    {p.priceOriginal > 0 && p.priceOriginal !== p.priceSale && (
                        <div style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through' }}>{vnd(p.priceOriginal)}</div>
                    )}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', transition: 'transform 200ms', transform: expanded ? 'rotate(180deg)' : 'none' }}>▼</span>
            </div>

            {/* Tags */}
            {p.industry.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                    {p.industry.map(ind => (
                        <span key={ind} style={{
                            fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                            background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 600,
                        }}>
                            {ind}
                        </span>
                    ))}
                </div>
            )}

            {/* Expanded */}
            {expanded && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                    {/* Prices summary */}
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        <PriceTag label="Giá gốc" value={p.priceOriginal} />
                        <PriceTag label="Giá thuê/tháng" value={p.priceRental} accent />
                        <PriceTag label="Giá bán" value={p.priceSale} />
                    </div>

                    {p.description && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>📝 Mô tả chi tiết</label>
                            <p style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.description}</p>
                        </div>
                    )}

                    {p.usageGuide && (
                        <div style={{ marginBottom: '12px' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px', display: 'block' }}>📘 Hướng dẫn sử dụng</label>
                            <p style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{p.usageGuide}</p>
                        </div>
                    )}

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        Key: <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>{p.key}</code>
                        &nbsp;·&nbsp;Slug: <code style={{ background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: '4px' }}>{p.slug}</code>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button onClick={onEdit} style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            background: 'var(--accent-primary)', color: '#fff', border: 'none', cursor: 'pointer',
                        }}>
                            ✏️ Sửa
                        </button>
                        <button onClick={onToggleActive} style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            background: p.isActive ? '#fef3c7' : '#d1fae5', color: p.isActive ? '#92400e' : '#065f46',
                            border: 'none', cursor: 'pointer',
                        }}>
                            {p.isActive ? '⏸ Tắt' : '▶ Bật'}
                        </button>
                        <button onClick={onDelete} style={{
                            padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                            background: '#fee2e2', color: '#991b1b', border: 'none', cursor: 'pointer',
                        }}>
                            🗑 Xoá
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function PriceTag({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
    return (
        <div style={{
            padding: '8px 14px', borderRadius: '10px',
            background: accent ? 'rgba(99,102,241,0.1)' : 'var(--bg-hover)',
        }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: accent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {value > 0 ? vnd(value) : '—'}
            </div>
        </div>
    );
}
