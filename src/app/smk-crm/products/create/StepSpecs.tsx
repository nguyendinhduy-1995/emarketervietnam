'use client';

import { EyewearSpecs, SIZE_TEMPLATES, FRAME_SHAPES, MATERIALS, FRAME_TYPES, FITS, GENDERS, COMPATIBLE_LENSES, inputStyle, labelStyle, cardStyle, chipStyle } from './types';

interface Props {
    specs: EyewearSpecs;
    setSpecs: (s: EyewearSpecs) => void;
}

const numInput = (val: number | '', onChange: (v: number | '') => void, placeholder: string, unit: string) => (
    <div style={{ position: 'relative' }}>
        <input type="number" value={val} min={0}
            onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
            placeholder={placeholder} style={{ ...inputStyle, padding: '10px 40px 10px 12px', fontSize: 'var(--text-sm)' }} />
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{unit}</span>
    </div>
);

export default function StepSpecs({ specs, setSpecs }: Props) {
    const update = (field: keyof EyewearSpecs, value: any) => setSpecs({ ...specs, [field]: value });
    const toggleLens = (lens: string) => {
        const arr = specs.compatibleLens;
        update('compatibleLens', arr.includes(lens) ? arr.filter(l => l !== lens) : [...arr, lens]);
    };
    const applyTemplate = (size: string) => {
        const t = SIZE_TEMPLATES[size];
        if (t) setSpecs({ ...specs, lensWidth: t.lensWidth, bridge: t.bridge, templeLength: t.templeLength, specsUnknown: false });
    };

    return (
        <div>
            {/* Size template quick-fill */}
            <div style={{ ...cardStyle, marginBottom: 'var(--space-4)' }}>
                <label style={labelStyle}>⚡ Chọn nhanh theo Size</label>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {Object.entries(SIZE_TEMPLATES).map(([size, t]) => (
                        <button key={size} onClick={() => applyTemplate(size)}
                            style={{ ...chipStyle(false), flex: 1, textAlign: 'center', padding: '10px 8px' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, display: 'block' }}>{size}</span>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                {t.lensWidth}-{t.bridge}-{t.templeLength}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Core 3 measurements */}
            <div style={{ ...cardStyle, marginBottom: 'var(--space-4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>📐 3 số đo chính</label>
                    <button onClick={() => update('specsUnknown', !specs.specsUnknown)}
                        style={{ ...chipStyle(specs.specsUnknown), fontSize: 10 }}>
                        {specs.specsUnknown ? '✓ Chưa rõ' : '❓ Chưa rõ'}
                    </button>
                </div>

                {specs.specsUnknown && (
                    <div style={{ background: 'rgba(245,158,11,0.1)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-3)', border: '1px solid rgba(245,158,11,0.3)' }}>
                        <p style={{ fontSize: 'var(--text-xs)', color: '#f59e0b' }}>⚠️ Disclaimer sẽ hiển thị trên trang sản phẩm: &quot;Thông số kính cần xác nhận thủ công&quot;</p>
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)', opacity: specs.specsUnknown ? 0.4 : 1 }}>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Lens Width *</label>
                        {numInput(specs.lensWidth, v => update('lensWidth', v), '52', 'mm')}
                    </div>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Bridge *</label>
                        {numInput(specs.bridge, v => update('bridge', v), '18', 'mm')}
                    </div>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Temple *</label>
                        {numInput(specs.templeLength, v => update('templeLength', v), '140', 'mm')}
                    </div>
                </div>
                {!specs.specsUnknown && specs.lensWidth && (Number(specs.lensWidth) < 30 || Number(specs.lensWidth) > 80) && (
                    <p style={{ fontSize: 'var(--text-xs)', color: '#ef4444', marginTop: 4 }}>⚠️ Lens Width nên trong khoảng 30-80mm</p>
                )}
            </div>

            {/* Optional measurements */}
            <div style={{ ...cardStyle, marginBottom: 'var(--space-4)' }}>
                <details>
                    <summary style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--gold-400)', fontSize: 'var(--text-sm)' }}>📏 Số đo bổ sung (optional)</summary>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Lens Height</label>
                            {numInput(specs.lensHeight, v => update('lensHeight', v), '', 'mm')}
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Frame Width</label>
                            {numInput(specs.frameWidth, v => update('frameWidth', v), '', 'mm')}
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Weight</label>
                            {numInput(specs.weight, v => update('weight', v), '', 'g')}
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>PD Range</label>
                            <input value={specs.pdRange} onChange={e => update('pdRange', e.target.value)}
                                placeholder="58-68" style={{ ...inputStyle, padding: '10px 12px', fontSize: 'var(--text-sm)' }} />
                        </div>
                    </div>
                </details>
            </div>

            {/* Attributes */}
            <div style={{ ...cardStyle, marginBottom: 'var(--space-4)' }}>
                <label style={{ ...labelStyle, marginBottom: 'var(--space-3)' }}>🏷️ Thuộc tính</label>

                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Frame Shape</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {FRAME_SHAPES.map(s => (
                                <button key={s} onClick={() => update('frameShape', specs.frameShape === s ? '' : s)}
                                    style={chipStyle(specs.frameShape === s)}>{s.replace('_', ' ')}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Material</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {MATERIALS.map(m => (
                                <button key={m} onClick={() => update('material', specs.material === m ? '' : m)}
                                    style={chipStyle(specs.material === m)}>{m}</button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Frame Type</label>
                            <select value={specs.frameType} onChange={e => update('frameType', e.target.value)} style={{ ...inputStyle, padding: '8px', fontSize: 'var(--text-xs)' }}>
                                <option value="">—</option>
                                {FRAME_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Fit</label>
                            <select value={specs.fit} onChange={e => update('fit', e.target.value)} style={{ ...inputStyle, padding: '8px', fontSize: 'var(--text-xs)' }}>
                                <option value="">—</option>
                                {FITS.map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Gender</label>
                            <select value={specs.gender} onChange={e => update('gender', e.target.value)} style={{ ...inputStyle, padding: '8px', fontSize: 'var(--text-xs)' }}>
                                <option value="">—</option>
                                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* UV / Blue-light / Compatible lenses */}
            <div style={cardStyle}>
                <label style={{ ...labelStyle, marginBottom: 'var(--space-3)' }}>🛡️ Bảo vệ & tương thích</label>
                <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>UV Protection</label>
                            <input value={specs.uvProtection} onChange={e => update('uvProtection', e.target.value)}
                                placeholder="UV400" style={{ ...inputStyle, padding: '8px 12px', fontSize: 'var(--text-sm)' }} />
                        </div>
                        <div>
                            <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Blue-light</label>
                            <button onClick={() => update('blueLightBlock', !specs.blueLightBlock)}
                                style={{ ...inputStyle, padding: '8px 12px', fontSize: 'var(--text-sm)', textAlign: 'center', cursor: 'pointer', background: specs.blueLightBlock ? 'rgba(34,197,94,0.15)' : undefined, color: specs.blueLightBlock ? '#22c55e' : undefined, fontWeight: specs.blueLightBlock ? 700 : 400 }}>
                                {specs.blueLightBlock ? '✓ Có' : 'Không'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label style={{ ...labelStyle, fontSize: 'var(--text-xs)' }}>Tròng tương thích</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {COMPATIBLE_LENSES.map(l => (
                                <button key={l} onClick={() => toggleLens(l)}
                                    style={chipStyle(specs.compatibleLens.includes(l))}>{l}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
