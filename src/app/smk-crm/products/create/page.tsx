'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
    MediaItem, VariantRow, EyewearSpecs, AIOutput,
    STEPS, formatVND, slugify, generateSKU, defaultSpecs,
    inputStyle, labelStyle, cardStyle, chipStyle,
} from './types';
import StepVariants from './StepVariants';
import StepSpecs from './StepSpecs';

export default function ProductCreateWizard() {
    const [step, setStep] = useState(0);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [productId, setProductId] = useState<string | null>(null);
    const [publishing, setPublishing] = useState(false);

    // Step 1: Name + Category
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [slugEdited, setSlugEdited] = useState(false);
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<{ id: string; value: string; label: string; icon: string }[]>([]);

    // Fetch categories from API
    useEffect(() => {
        fetch('/api/smk/admin/categories').then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => { });
    }, []);

    // Step 2: Images
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);

    // Step 3: Variants
    const [hasVariants, setHasVariants] = useState(false);
    const [variants, setVariants] = useState<VariantRow[]>([]);
    const [selectedColors, setSelectedColors] = useState<string[]>([]);
    const [selectedLensColors, setSelectedLensColors] = useState<string[]>([]);
    const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
    const [editingVariant, setEditingVariant] = useState<number | null>(null);

    // Step 4: Specs
    const [specs, setSpecs] = useState<EyewearSpecs>(defaultSpecs);

    // Step 5: Price (for single product or summary)
    const [price, setPrice] = useState<number | ''>('');
    const [compareAtPrice, setCompareAtPrice] = useState<number | ''>('');

    // Step 6: Stock
    const [initialQty, setInitialQty] = useState<number>(10);
    const [stockMode, setStockMode] = useState<'even' | 'manual'>('even');
    const [variantStock, setVariantStock] = useState<Record<string, number>>({});

    // Step 7: Content
    const [contentMode, setContentMode] = useState<'manual' | 'ai'>('manual');
    const [shortDesc, setShortDesc] = useState('');
    const [longDesc, setLongDesc] = useState('');
    const [bullets, setBullets] = useState<string[]>(['']);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [metaTitle, setMetaTitle] = useState('');
    const [metaDesc, setMetaDesc] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiOutput, setAiOutput] = useState<AIOutput | null>(null);
    const [aiTone, setAiTone] = useState('casual');
    const [aiChannel, setAiChannel] = useState('website');
    const [aiApplied, setAiApplied] = useState(false);
    const [aiTab, setAiTab] = useState('titles');

    const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); }, []);

    // Auto slug
    const handleNameChange = (v: string) => { setName(v); if (!slugEdited) setSlug(slugify(v)); };

    /* ═══ File Upload ═══ */
    const handleFiles = async (files: FileList | null) => {
        if (!files?.length) return;
        setUploading(true);
        const formData = new FormData();
        Array.from(files).forEach(f => formData.append('files', f));
        try {
            const res = await fetch('/api/smk/admin/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (data.error) showToast(`⚠️ ${data.error}`);
            else if (data.files) {
                setMedia(prev => [...prev, ...data.files.map((f: any, i: number) => ({ url: f.url, type: f.type, sort: prev.length + i, name: f.name }))]);
                showToast(`✅ Đã tải ${data.files.length} file`);
            }
        } catch { showToast('⚠️ Upload thất bại'); }
        setUploading(false);
    };
    const removeMedia = (idx: number) => setMedia(prev => prev.filter((_, i) => i !== idx).map((m, i) => ({ ...m, sort: i })));
    const moveMedia = (from: number, to: number) => {
        if (to < 0 || to >= media.length) return;
        setMedia(prev => { const n = [...prev];[n[from], n[to]] = [n[to], n[from]]; return n.map((m, i) => ({ ...m, sort: i })); });
    };
    const setAsHero = (idx: number) => {
        if (idx === 0) return;
        setMedia(prev => { const item = prev[idx]; const rest = prev.filter((_, i) => i !== idx); return [item, ...rest].map((m, i) => ({ ...m, sort: i })); });
    };

    /* ═══ Validation ═══ */
    const validateStep = (s: number): string[] => {
        const errs: string[] = [];
        if (s >= 0 && name.trim().length < 3) errs.push('Tên sản phẩm phải >= 3 ký tự');
        if (s >= 1 && media.length === 0) errs.push('Cần ít nhất 1 ảnh sản phẩm');
        if (s >= 2 && hasVariants && variants.length === 0) errs.push('Cần tạo ít nhất 1 biến thể');
        if (s >= 2 && hasVariants) {
            const skus = variants.map(v => v.sku);
            if (new Set(skus).size !== skus.length) errs.push('SKU bị trùng — kiểm tra lại');
            if (!variants.some(v => v.isActive)) errs.push('Cần ít nhất 1 biến thể đang bán');
        }
        if (s >= 3 && !specs.specsUnknown && specs.lensWidth && (Number(specs.lensWidth) < 30 || Number(specs.lensWidth) > 80)) errs.push('Lens Width nên 30-80mm');
        if (s >= 4 && !hasVariants && (!price || Number(price) <= 0)) errs.push('Giá bán phải > 0');
        if (s >= 4 && !hasVariants && compareAtPrice && price && Number(compareAtPrice) < Number(price)) errs.push('Giá gốc phải >= giá bán');
        if (s >= 5 && initialQty < 0) errs.push('Số lượng không được âm');
        return errs;
    };
    const goNext = () => { const errs = validateStep(step); if (errs.length) { setErrors(errs); return; } setErrors([]); setStep(Math.min(6, step + 1)); };
    const goBack = () => { setErrors([]); setStep(Math.max(0, step - 1)); };

    /* ═══ AI Content ═══ */
    const generateAI = async () => {
        if (!name.trim()) { showToast('⚠️ Nhập tên sản phẩm trước'); return; }
        setAiLoading(true);
        try {
            const imageUrls = media.filter(m => m.type === 'IMAGE').map(m => m.url).slice(0, 5);
            const res = await fetch('/api/smk/admin/ai/product-content', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, price: price || 0, imageUrls, channel: aiChannel, tone: aiTone, specs }),
            });
            setAiOutput(await res.json());
            setAiApplied(false);
            showToast('✨ AI đã tạo nội dung!');
        } catch { showToast('⚠️ AI tạo nội dung thất bại'); }
        setAiLoading(false);
    };
    const applyAI = () => {
        if (!aiOutput) return;
        if (aiOutput.shortDesc) setShortDesc(aiOutput.shortDesc);
        if (aiOutput.longDesc) setLongDesc(aiOutput.longDesc);
        if (aiOutput.bullets?.length) setBullets(aiOutput.bullets);
        if (aiOutput.tags) setTags(prev => [...new Set([...prev, ...aiOutput.tags!])]);
        if (aiOutput.seo) { setMetaTitle(aiOutput.seo.metaTitle); setMetaDesc(aiOutput.seo.metaDescription); }
        setAiApplied(true); showToast('✅ Đã áp dụng nội dung AI');
    };

    /* ═══ Publish ═══ */
    const handlePublish = async () => {
        const errs = validateStep(6); if (errs.length) { setErrors(errs); return; }
        setPublishing(true); setErrors([]);
        try {
            const effectiveVariants = hasVariants ? variants.filter(v => v.isActive).map(v => ({
                frameColor: v.frameColor, lensColor: v.lensColor, size: v.size,
                sku: v.sku, price: Number(v.price) || Number(price), compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
                isActive: true, lensWidth: v.lensWidth || undefined, bridge: v.bridge || undefined,
                templeLength: v.templeLength || undefined, weight: v.weight || undefined, material: v.material || undefined,
            })) : undefined;

            const stockAllocation = hasVariants
                ? (stockMode === 'even'
                    ? variants.filter(v => v.isActive).map((v, i) => ({ index: i, qty: Math.floor(initialQty / variants.filter(x => x.isActive).length) + (i < initialQty % variants.filter(x => x.isActive).length ? 1 : 0) }))
                    : variants.filter(v => v.isActive).map((v) => ({ sku: v.sku, qty: variantStock[v.id] || 0 }))
                ) : undefined;

            const payload = {
                name: name.trim(), slug, description: shortDesc || longDesc || '',
                price: hasVariants ? undefined : Number(price),
                compareAtPrice: !hasVariants && compareAtPrice ? Number(compareAtPrice) : undefined,
                initialQty, images: media.map(m => m.url),
                variants: effectiveVariants, stockAllocation,
                specs: { lensWidth: specs.lensWidth || undefined, bridge: specs.bridge || undefined, templeLength: specs.templeLength || undefined, lensHeight: specs.lensHeight || undefined, frameWidth: specs.frameWidth || undefined, frameShape: specs.frameShape || undefined, material: specs.material || undefined, frameType: specs.frameType || undefined, fit: specs.fit || undefined, gender: specs.gender || undefined, weight: specs.weight || undefined, pdRange: specs.pdRange || undefined, uvProtection: specs.uvProtection || undefined, blueLightBlock: specs.blueLightBlock, compatibleLens: specs.compatibleLens },
                shortDesc, longDesc, bullets: bullets.filter(Boolean), tags, metaTitle, metaDesc, status: 'ACTIVE',
            };
            const res = await fetch('/api/smk/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const data = await res.json();
            if (data.error) setErrors(data.errors || [data.error]);
            else { showToast('🎉 Đã đăng sản phẩm!'); setTimeout(() => { window.location.href = '/smk-crm/products'; }, 1500); }
        } catch { setErrors(['❌ Đăng sản phẩm thất bại']); }
        setPublishing(false);
    };

    const handleSaveDraft = async () => {
        if (!name.trim()) { showToast('⚠️ Nhập tên trước'); return; }
        setSaving(true);
        try {
            const payload = {
                name: name.trim(), slug, description: shortDesc || '', status: 'DRAFT',
                draftData: { step, media, price, compareAtPrice, initialQty, hasVariants, variants, specs, shortDesc, longDesc, bullets, tags, metaTitle, metaDesc, selectedColors, selectedLensColors, selectedSizes, stockMode, variantStock }
            };
            if (productId) { await fetch('/api/smk/admin/products', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: productId, ...payload }) }); }
            else { const res = await fetch('/api/smk/admin/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const data = await res.json(); if (data.product?.id) setProductId(data.product.id); }
            showToast('💾 Đã lưu nháp');
        } catch { showToast('⚠️ Lưu nháp thất bại'); }
        setSaving(false);
    };

    /* ═══ RENDER ═══ */
    return (
        <div className="animate-in" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>
            {/* Breadcrumb */}
            <nav style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-3)' }}>
                <Link href="/smk-crm" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Admin</Link>{' › '}
                <Link href="/smk-crm/products" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Sản phẩm</Link>{' › '}
                <span style={{ color: 'var(--text-primary)' }}>Đăng mới</span>
            </nav>

            {/* Progress Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                        <button onClick={() => { if (i <= step) { setErrors([]); setStep(i); } }}
                            style={{
                                width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                                background: i < step ? 'var(--gold-500)' : i === step ? 'rgba(212,168,83,0.2)' : 'var(--bg-tertiary)',
                                color: i < step ? '#000' : i === step ? 'var(--gold-400)' : 'var(--text-muted)',
                                fontWeight: 700, fontSize: 12, cursor: i <= step ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: i === step ? '2px solid var(--gold-400)' : i < step ? '2px solid var(--gold-500)' : '2px solid transparent',
                                transition: 'all 0.2s',
                            }}>
                            {i < step ? '✓' : s.icon}
                        </button>
                        {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 2px', background: i < step ? 'var(--gold-500)' : 'var(--bg-tertiary)', transition: 'background 0.3s', minWidth: 8 }} />}
                    </div>
                ))}
            </div>

            {/* Step Title */}
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 800, marginBottom: 2 }}>{STEPS[step].icon} {STEPS[step].desc}</h1>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Bước {step + 1} / {STEPS.length}{saving && ' · 💾 Đang lưu...'}</p>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)' }}>
                    {errors.map((e, i) => <p key={i} style={{ color: '#ef4444', fontSize: 'var(--text-sm)', margin: '2px 0' }}>⚠️ {e}</p>)}
                </div>
            )}

            {/* ═══ STEP 1: TÊN + DANH MỤC ═══ */}
            {step === 0 && (
                <div style={cardStyle}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label style={labelStyle}>Tên sản phẩm *</label>
                        <input type="text" value={name} onChange={e => handleNameChange(e.target.value)} placeholder="VD: Gọng Kính Camel Alloy C1911" style={{ ...inputStyle, fontSize: 18, fontWeight: 600 }} autoFocus />
                    </div>

                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label style={labelStyle}>Danh mục *</label>
                        <select value={category} onChange={e => setCategory(e.target.value)}
                            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23888\' stroke-width=\'2\'%3E%3Cpath d=\'m6 9 6 6 6-6\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center' }}>
                            <option value="">— Chọn danh mục —</option>
                            {categories.map(c => (
                                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {categories.map(c => (
                                <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                                    style={{
                                        padding: '6px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                                        cursor: 'pointer', transition: 'all 0.15s',
                                        border: category === c.value ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)',
                                        background: category === c.value ? 'rgba(212,168,83,0.15)' : 'var(--bg-tertiary)',
                                        color: category === c.value ? 'var(--gold-400)' : 'var(--text-primary)',
                                    }}>
                                    {c.icon} {c.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={labelStyle}>Slug (đường dẫn)</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', flexShrink: 0 }}>/p/</span>
                            <input type="text" value={slug} onChange={e => { setSlug(e.target.value); setSlugEdited(true); }} placeholder="auto-generated" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 'var(--text-sm)' }} />
                        </div>
                        {slugEdited && <button onClick={() => { setSlugEdited(false); setSlug(slugify(name)); }} style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-400)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4, padding: 0 }}>↩ Tự động lại</button>}
                    </div>
                </div>
            )}

            {/* ═══ STEP 2: ẢNH ═══ */}
            {step === 1 && (
                <div style={cardStyle}>
                    <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)}
                        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ border: `2px dashed ${dragOver ? 'var(--gold-400)' : 'var(--border-primary)'}`, borderRadius: 'var(--radius-xl)', padding: media.length === 0 ? 'var(--space-10) var(--space-4)' : 'var(--space-4)', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(212,168,83,0.05)' : 'transparent', transition: 'all 0.2s', marginBottom: media.length > 0 ? 'var(--space-4)' : 0 }}>
                        <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" onChange={e => handleFiles(e.target.files)} style={{ display: 'none' }} />
                        {uploading ? <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gold-400)' }}>⏳ Đang tải lên...</p>
                            : media.length === 0 ? <><p style={{ fontSize: 32, marginBottom: 8 }}>📸</p><p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>Kéo &amp; Thả ảnh vào đây</p><p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 4 }}>hoặc bấm để chọn · JPG, PNG, WEBP · Tối đa 5MB/file</p></>
                                : <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>📁 Bấm hoặc kéo thêm · {media.length} file</p>}
                    </div>
                    {media.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 'var(--space-2)' }}>
                            {media.map((m, i) => (
                                <div key={i} style={{ position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: i === 0 ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)', aspectRatio: '1', background: 'var(--bg-tertiary)' }}>
                                    {m.type === 'IMAGE' ? <Image src={m.url} alt="" fill style={{ objectFit: 'cover' }} sizes="100px" /> : <video src={m.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                    {i === 0 && <span style={{ position: 'absolute', top: 3, left: 3, background: 'var(--gold-500)', color: '#000', padding: '1px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700 }}>⭐</span>}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 2, padding: 3, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' }}>
                                        {i !== 0 && <button onClick={e => { e.stopPropagation(); setAsHero(i); }} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>⭐</button>}
                                        <button onClick={e => { e.stopPropagation(); moveMedia(i, i - 1); }} disabled={i === 0} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, cursor: 'pointer', fontSize: 10, opacity: i === 0 ? 0.3 : 1 }}>◀</button>
                                        <button onClick={e => { e.stopPropagation(); moveMedia(i, i + 1); }} disabled={i === media.length - 1} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, cursor: 'pointer', fontSize: 10, opacity: i === media.length - 1 ? 0.3 : 1 }}>▶</button>
                                        <button onClick={e => { e.stopPropagation(); removeMedia(i); }} style={{ background: 'rgba(239,68,68,0.8)', border: 'none', color: '#fff', padding: '2px 5px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>✕</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STEP 3: VARIANTS ═══ */}
            {step === 2 && (
                <StepVariants hasVariants={hasVariants} setHasVariants={setHasVariants} variants={variants} setVariants={setVariants} slug={slug} defaultPrice={price} defaultCompareAt={compareAtPrice} media={media} selectedColors={selectedColors} setSelectedColors={setSelectedColors} selectedLensColors={selectedLensColors} setSelectedLensColors={setSelectedLensColors} selectedSizes={selectedSizes} setSelectedSizes={setSelectedSizes} editingVariant={editingVariant} setEditingVariant={setEditingVariant} />
            )}

            {/* ═══ STEP 4: SPECS ═══ */}
            {step === 3 && <StepSpecs specs={specs} setSpecs={setSpecs} />}

            {/* ═══ STEP 5: GIÁ ═══ */}
            {step === 4 && (
                <div style={cardStyle}>
                    {hasVariants && variants.length > 0 ? (
                        <div>
                            <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>💰 Giá theo biến thể</p>
                            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                                {variants.filter(v => v.isActive).map(v => (
                                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                        <span style={{ fontSize: 'var(--text-sm)' }}>{v.frameColor}{v.lensColor ? ` / ${v.lensColor}` : ''}{v.size ? ` / ${v.size}` : ''}</span>
                                        <span style={{ fontWeight: 700, color: 'var(--gold-400)', fontSize: 'var(--text-sm)' }}>{v.price ? formatVND(Number(v.price)) : '—'}</span>
                                    </div>
                                ))}
                            </div>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>💡 Chỉnh giá từng variant ở Bước 3 (Biến thể)</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 'var(--space-5)' }}>
                                <label style={labelStyle}>Giá bán *</label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={price} min={0} onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')} placeholder="500000" style={{ ...inputStyle, fontSize: 24, fontWeight: 700, paddingRight: 50 }} />
                                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 600 }}>₫</span>
                                </div>
                                {price && Number(price) > 0 && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gold-400)', fontWeight: 600, marginTop: 6 }}>{formatVND(Number(price))}</p>}
                            </div>
                            <div>
                                <label style={labelStyle}>Giá gốc <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span></label>
                                <div style={{ position: 'relative' }}>
                                    <input type="number" value={compareAtPrice} min={0} onChange={e => setCompareAtPrice(e.target.value ? Number(e.target.value) : '')} placeholder="1500000" style={{ ...inputStyle, paddingRight: 50 }} />
                                    <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>₫</span>
                                </div>
                                {compareAtPrice && price && Number(compareAtPrice) > Number(price) && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatVND(Number(compareAtPrice))}</span>
                                        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: '#22c55e', background: 'rgba(34,197,94,0.1)', padding: '2px 10px', borderRadius: 99 }}>-{Math.round((1 - Number(price) / Number(compareAtPrice)) * 100)}%</span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══ STEP 6: KHO ═══ */}
            {step === 5 && (
                <div style={cardStyle}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label style={labelStyle}>Tổng số lượng tồn đầu kỳ *</label>
                        <input type="number" value={initialQty} min={0} onChange={e => setInitialQty(Math.max(0, Number(e.target.value)))} style={{ ...inputStyle, fontSize: 24, fontWeight: 700, textAlign: 'center', maxWidth: 200 }} />
                    </div>
                    {hasVariants && variants.filter(v => v.isActive).length > 1 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <label style={labelStyle}>Phân bổ cho biến thể</label>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                                <button onClick={() => setStockMode('even')} style={chipStyle(stockMode === 'even')}>🔄 Chia đều</button>
                                <button onClick={() => setStockMode('manual')} style={chipStyle(stockMode === 'manual')}>✏️ Nhập tay</button>
                            </div>
                            <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                                {variants.filter(v => v.isActive).map((v, i) => {
                                    const activeCount = variants.filter(x => x.isActive).length;
                                    const evenQty = Math.floor(initialQty / activeCount) + (i < initialQty % activeCount ? 1 : 0);
                                    return (
                                        <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px 12px', background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)' }}>
                                            <span style={{ flex: 1, fontSize: 'var(--text-sm)' }}>{v.frameColor}{v.size ? ` / ${v.size}` : ''}</span>
                                            {stockMode === 'even' ? (
                                                <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--gold-400)', minWidth: 40, textAlign: 'right' }}>{evenQty}</span>
                                            ) : (
                                                <input type="number" value={variantStock[v.id] || 0} min={0}
                                                    onChange={e => setVariantStock({ ...variantStock, [v.id]: Math.max(0, Number(e.target.value)) })}
                                                    style={{ ...inputStyle, width: 70, padding: '6px 8px', fontSize: 'var(--text-sm)', textAlign: 'center' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <div style={{ background: 'rgba(212,168,83,0.08)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', border: '1px solid rgba(212,168,83,0.2)' }}>
                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 8, color: 'var(--gold-400)' }}>📋 Cách tính tồn kho</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>Khi đăng, tạo <strong>Phiếu nhập kho (RECEIPT)</strong> lý do <strong>&quot;OPENING_STOCK&quot;</strong> cho {hasVariants ? 'từng variant' : 'sản phẩm'}.</p>
                    </div>
                </div>
            )}

            {/* ═══ STEP 7: NỘI DUNG ═══ */}
            {step === 6 && (
                <div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                        <button onClick={() => setContentMode('manual')} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: contentMode === 'manual' ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)', background: contentMode === 'manual' ? 'rgba(212,168,83,0.08)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center' }}>
                            <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>✏️</span>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Thủ công</span>
                        </button>
                        <button onClick={() => setContentMode('ai')} style={{ flex: 1, padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', border: contentMode === 'ai' ? '2px solid var(--gold-400)' : '1px solid var(--border-primary)', background: contentMode === 'ai' ? 'rgba(212,168,83,0.08)' : 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center' }}>
                            <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>🤖</span>
                            <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Trợ lý AI</span>
                        </button>
                    </div>

                    {contentMode === 'manual' && (
                        <div style={cardStyle}>
                            <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                                <div><label style={labelStyle}>Mô tả ngắn</label><textarea value={shortDesc} onChange={e => setShortDesc(e.target.value)} rows={3} placeholder="1-2 câu mô tả nhanh..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
                                <div><label style={labelStyle}>Mô tả chi tiết</label><textarea value={longDesc} onChange={e => setLongDesc(e.target.value)} rows={5} placeholder="Mô tả đầy đủ..." style={{ ...inputStyle, resize: 'vertical' }} /></div>
                                <div>
                                    <label style={labelStyle}>Điểm nổi bật</label>
                                    {bullets.map((b, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                            <span style={{ color: 'var(--gold-400)', fontWeight: 700, paddingTop: 14 }}>•</span>
                                            <input type="text" value={b} onChange={e => setBullets(prev => prev.map((x, j) => j === i ? e.target.value : x))} placeholder={`Điểm ${i + 1}`} style={{ ...inputStyle, flex: 1 }} />
                                            {bullets.length > 1 && <button onClick={() => setBullets(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, minWidth: 32 }}>✕</button>}
                                        </div>
                                    ))}
                                    <button onClick={() => setBullets(prev => [...prev, ''])} style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-400)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Thêm</button>
                                </div>
                                <div>
                                    <label style={labelStyle}>Tags</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 6 }}>
                                        {tags.map((t, i) => <span key={i} style={{ background: 'rgba(212,175,55,0.15)', padding: '4px 12px', borderRadius: 99, fontSize: 'var(--text-xs)', display: 'flex', alignItems: 'center', gap: 4 }}>{t}<button onClick={() => setTags(tags.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>×</button></span>)}
                                    </div>
                                    <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && tagInput.trim()) { setTags([...tags, tagInput.trim()]); setTagInput(''); e.preventDefault(); } }} placeholder="Thêm tag + Enter" style={{ ...inputStyle, maxWidth: 250 }} />
                                </div>
                                <details>
                                    <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--gold-400)', fontSize: 'var(--text-sm)' }}>🔍 SEO</summary>
                                    <div style={{ display: 'grid', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
                                        <div><label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Meta Title</label><input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="Tiêu đề SEO" style={inputStyle} /></div>
                                        <div><label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Meta Description</label><textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={2} placeholder="150–160 ký tự" style={{ ...inputStyle, resize: 'vertical' }} /></div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    )}

                    {contentMode === 'ai' && (
                        <div style={cardStyle}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div><label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Giọng điệu</label><select value={aiTone} onChange={e => setAiTone(e.target.value)} style={inputStyle}><option value="casual">🏪 Bình dân</option><option value="premium">✨ Sang trọng</option><option value="young">🔥 Trẻ trung</option><option value="kol_review">📱 KOL review</option></select></div>
                                <div><label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Kênh</label><select value={aiChannel} onChange={e => setAiChannel(e.target.value)} style={inputStyle}><option value="website">🌐 Website</option><option value="facebook">📘 Facebook</option><option value="tiktok">📱 TikTok</option><option value="zalo">💬 Zalo</option></select></div>
                            </div>
                            {specs.specsUnknown && <div style={{ background: 'rgba(245,158,11,0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245,158,11,0.3)', marginBottom: 'var(--space-3)' }}><p style={{ fontSize: 'var(--text-xs)', color: '#f59e0b' }}>⚠️ Specs chưa rõ — AI sẽ không bịa số đo, chỉ gợi ý chung</p></div>}
                            <button className="btn btn-primary" onClick={generateAI} disabled={aiLoading} style={{ width: '100%', fontWeight: 700, marginBottom: 'var(--space-4)' }}>{aiLoading ? '⏳ Đang tạo...' : '🤖 Trợ lý tạo nội dung'}</button>
                            {aiOutput && (
                                <div>
                                    <div style={{ display: 'flex', gap: 4, marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                                        {[{ key: 'titles', label: '📝 Titles' }, { key: 'desc', label: '📄 Mô tả' }, { key: 'seo', label: '🔍 SEO' }].map(t => (
                                            <button key={t.key} onClick={() => setAiTab(t.key)} className="btn" style={{ fontSize: 11, padding: '5px 10px', background: aiTab === t.key ? 'var(--gold-500)' : 'var(--bg-primary)', color: aiTab === t.key ? '#000' : 'var(--text-primary)', borderRadius: 'var(--radius-md)' }}>{t.label}</button>
                                        ))}
                                    </div>
                                    <div style={{ background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', minHeight: 80, marginBottom: 'var(--space-3)' }}>
                                        {aiTab === 'titles' && aiOutput.titleOptions?.map((t, i) => <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between' }}><span style={{ fontSize: 'var(--text-sm)' }}>{t}</span><button className="btn" onClick={() => setName(t)} style={{ fontSize: 10, padding: '2px 8px' }}>Chọn</button></div>)}
                                        {aiTab === 'desc' && <><p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)', color: 'var(--text-secondary)' }}>{aiOutput.shortDesc}</p><p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{aiOutput.longDesc}</p></>}
                                        {aiTab === 'seo' && aiOutput.seo && <><p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{aiOutput.seo.metaTitle}</p><p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 8 }}>{aiOutput.seo.metaDescription}</p></>}
                                    </div>
                                    {aiOutput.disclaimers?.length ? <div style={{ padding: 'var(--space-3)', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)' }}>{aiOutput.disclaimers.map((d, i) => <p key={i} style={{ fontSize: 'var(--text-xs)', color: '#f59e0b' }}>⚠️ {d}</p>)}</div> : null}
                                    <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                        <button className="btn btn-primary" onClick={applyAI} disabled={aiApplied}>{aiApplied ? '✅ Đã áp dụng' : '✅ Áp dụng'}</button>
                                        <button className="btn" onClick={generateAI} disabled={aiLoading}>🔄 Tạo lại</button>
                                        <button className="btn" onClick={() => { applyAI(); setContentMode('manual'); }}>✏️ Sửa</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ═══ STICKY CTA ═══ */}
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--bg-primary)', borderTop: '1px solid var(--border-primary)', padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-3)', justifyContent: 'center', zIndex: 50, backdropFilter: 'blur(12px)' }}>
                <div style={{ display: 'flex', gap: 'var(--space-3)', maxWidth: 720, width: '100%' }}>
                    {step > 0 && <button className="btn" onClick={goBack} style={{ minWidth: 90 }}>← Quay lại</button>}
                    {step === 0 && <button className="btn" onClick={handleSaveDraft} disabled={saving || !name.trim()} style={{ minWidth: 90 }}>{saving ? '💾...' : '💾 Lưu nháp'}</button>}
                    <div style={{ flex: 1 }} />
                    {step < 6 ? (
                        <button className="btn btn-primary" onClick={goNext} style={{ minWidth: 140, fontWeight: 700, fontSize: 15 }}>Tiếp tục →</button>
                    ) : (
                        <button className="btn btn-primary" onClick={handlePublish} disabled={publishing} style={{ minWidth: 160, fontWeight: 700, fontSize: 15 }}>{publishing ? '⏳ Đang đăng...' : '🚀 Đăng sản phẩm'}</button>
                    )}
                </div>
            </div>

            {/* Toast */}
            {toast && <div style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-secondary)', border: '1px solid var(--gold-400)', padding: 'var(--space-3) var(--space-5)', borderRadius: 'var(--radius-lg)', zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', fontSize: 'var(--text-sm)', whiteSpace: 'nowrap' }}>{toast}</div>}
        </div>
    );
}
