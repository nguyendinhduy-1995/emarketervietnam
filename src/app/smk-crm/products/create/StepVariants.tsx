'use client';

import Image from 'next/image';
import { VariantRow, MediaItem, FRAME_COLORS, LENS_COLORS, SIZES, generateSKU, formatVND, inputStyle, labelStyle, cardStyle, chipStyle } from './types';

interface Props {
    hasVariants: boolean;
    setHasVariants: (v: boolean) => void;
    variants: VariantRow[];
    setVariants: (v: VariantRow[]) => void;
    slug: string;
    defaultPrice: number | '';
    defaultCompareAt: number | '';
    media: MediaItem[];
    selectedColors: string[];
    setSelectedColors: (c: string[]) => void;
    selectedLensColors: string[];
    setSelectedLensColors: (c: string[]) => void;
    selectedSizes: string[];
    setSelectedSizes: (c: string[]) => void;
    editingVariant: number | null;
    setEditingVariant: (i: number | null) => void;
}

function makeId() { return Math.random().toString(36).slice(2, 10); }

export default function StepVariants(props: Props) {
    const {
        hasVariants, setHasVariants, variants, setVariants, slug,
        defaultPrice, defaultCompareAt, media,
        selectedColors, setSelectedColors, selectedLensColors, setSelectedLensColors,
        selectedSizes, setSelectedSizes, editingVariant, setEditingVariant,
    } = props;

    const toggleChip = (arr: string[], set: (a: string[]) => void, val: string) => {
        set(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    };

    // Auto-generate variants from selected attributes
    const generateVariants = () => {
        const colors = selectedColors.length ? selectedColors : ['Default'];
        const lenses = selectedLensColors.length ? selectedLensColors : [''];
        const sizes = selectedSizes.length ? selectedSizes : [''];

        const newVars: VariantRow[] = [];
        let idx = 0;
        for (const color of colors) {
            for (const lens of lenses) {
                for (const size of sizes) {
                    const existing = variants.find(v =>
                        v.frameColor === color && v.lensColor === lens && v.size === size
                    );
                    newVars.push(existing || {
                        id: makeId(),
                        frameColor: color,
                        lensColor: lens,
                        size,
                        sku: generateSKU(slug, color, size, idx),
                        price: defaultPrice,
                        compareAtPrice: defaultCompareAt,
                        isActive: true,
                        mediaIdx: null,
                        lensWidth: '', bridge: '', templeLength: '',
                        lensHeight: '', frameWidth: '', weight: '', material: '',
                    });
                    idx++;
                }
            }
        }
        setVariants(newVars);
    };

    const updateVariant = (idx: number, field: keyof VariantRow, value: any) => {
        setVariants(variants.map((v, i) => i === idx ? { ...v, [field]: value } : v));
    };

    const removeVariant = (idx: number) => {
        setVariants(variants.filter((_, i) => i !== idx));
        if (editingVariant === idx) setEditingVariant(null);
    };

    return (
        <div>
            {/* Toggle */}
            <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div>
                    <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Sản phẩm có nhiều biến thể?</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        VD: nhiều màu gọng, màu tròng, size khác nhau
                    </p>
                </div>
                <button
                    onClick={() => setHasVariants(!hasVariants)}
                    style={{
                        width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                        background: hasVariants ? 'var(--gold-500)' : 'var(--bg-tertiary)',
                        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                    }}
                >
                    <div style={{
                        width: 22, height: 22, borderRadius: '50%', background: '#fff',
                        position: 'absolute', top: 3,
                        left: hasVariants ? 27 : 3, transition: 'left 0.2s',
                    }} />
                </button>
            </div>

            {hasVariants && (
                <>
                    {/* Attribute selectors */}
                    <div style={{ ...cardStyle, marginBottom: 'var(--space-4)' }}>
                        {/* Frame Colors */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>🎨 Màu gọng</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {FRAME_COLORS.map(c => (
                                    <button key={c} onClick={() => toggleChip(selectedColors, setSelectedColors, c)}
                                        style={chipStyle(selectedColors.includes(c))}>{c}</button>
                                ))}
                            </div>
                        </div>

                        {/* Lens Colors */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>🔵 Màu tròng</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {LENS_COLORS.map(c => (
                                    <button key={c} onClick={() => toggleChip(selectedLensColors, setSelectedLensColors, c)}
                                        style={chipStyle(selectedLensColors.includes(c))}>{c}</button>
                                ))}
                            </div>
                        </div>

                        {/* Sizes */}
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>📏 Size gọng</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {SIZES.map(s => (
                                    <button key={s} onClick={() => toggleChip(selectedSizes, setSelectedSizes, s)}
                                        style={chipStyle(selectedSizes.includes(s))}>{s}</button>
                                ))}
                            </div>
                        </div>

                        <button className="btn btn-primary" onClick={generateVariants} style={{ width: '100%', fontWeight: 700 }}>
                            ⚡ Tạo biến thể ({Math.max(1, selectedColors.length) * Math.max(1, selectedLensColors.length) * Math.max(1, selectedSizes.length)} kết hợp)
                        </button>
                    </div>

                    {/* Variant list */}
                    {variants.length > 0 && (
                        <div style={cardStyle}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                                <label style={{ ...labelStyle, marginBottom: 0 }}>{variants.length} biến thể</label>
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                    {variants.filter(v => v.isActive).length} active
                                </span>
                            </div>

                            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                                {variants.map((v, i) => (
                                    <div key={v.id} style={{
                                        background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)',
                                        border: editingVariant === i ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)',
                                        padding: 'var(--space-3)', opacity: v.isActive ? 1 : 0.5,
                                    }}>
                                        {/* Variant header */}
                                        <div onClick={() => setEditingVariant(editingVariant === i ? null : i)}
                                            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', cursor: 'pointer' }}>
                                            {v.mediaIdx != null && media[v.mediaIdx] && (
                                                <div style={{ width: 40, height: 40, borderRadius: 6, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
                                                    <Image src={media[v.mediaIdx].url} alt="" fill style={{ objectFit: 'cover' }} sizes="40px" />
                                                </div>
                                            )}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                                                    {v.frameColor}{v.lensColor ? ` / ${v.lensColor}` : ''}{v.size ? ` / ${v.size}` : ''}
                                                </p>
                                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{v.sku}</p>
                                            </div>
                                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--gold-400)' }}>
                                                {v.price ? formatVND(Number(v.price)) : '—'}
                                            </span>
                                            <span style={{ fontSize: 12 }}>{editingVariant === i ? '▲' : '▼'}</span>
                                        </div>

                                        {/* Expanded editor (drawer) */}
                                        {editingVariant === i && (
                                            <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--border-primary)', display: 'grid', gap: 'var(--space-3)' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                                                    <div>
                                                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>SKU</label>
                                                        <input value={v.sku} onChange={e => updateVariant(i, 'sku', e.target.value)}
                                                            style={{ ...inputStyle, fontSize: 'var(--text-xs)', fontFamily: 'monospace', padding: '8px 10px' }} />
                                                    </div>
                                                    <div>
                                                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Giá bán</label>
                                                        <input type="number" value={v.price} onChange={e => updateVariant(i, 'price', e.target.value ? Number(e.target.value) : '')}
                                                            style={{ ...inputStyle, fontSize: 'var(--text-xs)', padding: '8px 10px' }} placeholder="Inherit" />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                                                    <div>
                                                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Giá gốc</label>
                                                        <input type="number" value={v.compareAtPrice} onChange={e => updateVariant(i, 'compareAtPrice', e.target.value ? Number(e.target.value) : '')}
                                                            style={{ ...inputStyle, fontSize: 'var(--text-xs)', padding: '8px 10px' }} placeholder="Optional" />
                                                    </div>
                                                    <div>
                                                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Trạng thái</label>
                                                        <button onClick={() => updateVariant(i, 'isActive', !v.isActive)}
                                                            style={{ ...inputStyle, padding: '8px 10px', fontSize: 'var(--text-xs)', textAlign: 'center', cursor: 'pointer', background: v.isActive ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: v.isActive ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                                                            {v.isActive ? '● Bán' : '○ Tắt'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Assign media */}
                                                {media.length > 0 && (
                                                    <div>
                                                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Ảnh riêng</label>
                                                        <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
                                                            <button onClick={() => updateVariant(i, 'mediaIdx', null)}
                                                                style={{ ...chipStyle(v.mediaIdx === null), fontSize: 10, padding: '4px 8px' }}>Mặc định</button>
                                                            {media.filter(m => m.type === 'IMAGE').map((m, mi) => (
                                                                <button key={mi} onClick={() => updateVariant(i, 'mediaIdx', mi)}
                                                                    style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', position: 'relative', border: v.mediaIdx === mi ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)', padding: 0, cursor: 'pointer', flexShrink: 0 }}>
                                                                    <Image src={m.url} alt="" fill style={{ objectFit: 'cover' }} sizes="36px" />
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <button onClick={() => removeVariant(i)}
                                                    style={{ fontSize: 'var(--text-xs)', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
                                                    🗑️ Xóa biến thể này
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {!hasVariants && (
                <div style={{ ...cardStyle, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>✨</p>
                    <p style={{ fontSize: 'var(--text-sm)' }}>Sản phẩm đơn — không cần biến thể</p>
                    <p style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>Hệ thống sẽ tự tạo 1 variant mặc định</p>
                </div>
            )}
        </div>
    );
}
