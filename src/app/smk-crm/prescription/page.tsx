'use client';

import { useState } from 'react';
import Link from 'next/link';

const LENS_OPTIONS = [
    { id: 'blue_light', name: 'Chống ánh sáng xanh', desc: 'Giảm mỏi mắt khi dùng máy tính/điện thoại', price: 350000, icon: '💙' },
    { id: 'photochromic', name: 'Đổi màu tự động', desc: 'Trong suốt trong nhà, tối khi ra nắng', price: 650000, icon: '🌓' },
    { id: 'uv', name: 'Chống tia UV 400', desc: 'Bảo vệ mắt khỏi tia cực tím', price: 200000, icon: '☀️' },
    { id: 'polarized', name: 'Phân cực (Polarized)', desc: 'Giảm chói, lý tưởng cho lái xe', price: 500000, icon: '🕶️' },
    { id: 'progressive', name: 'Đa tròng (Progressive)', desc: 'Nhìn xa + gần trong 1 tròng, không vạch chia', price: 1200000, icon: '🔍' },
    { id: 'bifocal', name: 'Hai tròng (Bifocal)', desc: 'Vùng nhìn xa + gần rõ ràng', price: 800000, icon: '👓' },
];

const fmtMoney = (n: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button onClick={onToggle} style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer', padding: 2,
            background: enabled ? 'linear-gradient(135deg, var(--gold-400), var(--gold-600))' : 'var(--bg-tertiary)',
            transition: 'background 250ms ease', flexShrink: 0,
        }}>
            <span style={{
                display: 'block', width: 22, height: 22, borderRadius: '50%',
                background: enabled ? '#fff' : 'var(--text-muted)',
                transform: enabled ? 'translateX(22px)' : 'translateX(0)',
                transition: 'transform 250ms ease, background 250ms ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }} />
        </button>
    );
}

export default function AdminPrescriptionPage() {
    const [lensOptions, setLensOptions] = useState(LENS_OPTIONS.map(l => ({ ...l, enabled: true })));
    const [toast, setToast] = useState<string | null>(null);
    const [prescriptionEnabled, setPrescriptionEnabled] = useState(true);
    const [comboEnabled, setComboEnabled] = useState(true);

    const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };
    const toggleLens = (index: number) => {
        setLensOptions(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], enabled: !updated[index].enabled };
            showToast(`${updated[index].icon} ${updated[index].name} — ${updated[index].enabled ? 'Đã bật' : 'Đã tắt'}`);
            return updated;
        });
    };
    const enabledCount = lensOptions.filter(l => l.enabled).length;

    const PRESCRIPTION_FIELDS = [
        { field: 'SPH (Cầu)', example: '-2.50', note: 'Độ cận (-) hoặc viễn (+)' },
        { field: 'CYL (Trụ)', example: '-0.75', note: 'Độ loạn' },
        { field: 'AXIS (Trục)', example: '180', note: 'Hướng loạn (0-180°)' },
        { field: 'ADD', example: '+1.50', note: 'Độ cộng (đa tròng)' },
        { field: 'PD', example: '62 mm', note: 'Khoảng cách đồng tử' },
    ];

    return (
        <div className="animate-in">
            <nav style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }}>
                <Link href="/admin" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Admin</Link>
                {' › '}<span style={{ color: 'var(--text-primary)' }}>Đơn kính</span>
            </nav>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <h1 className="admin-page-title">👓 Tròng kính &amp; Đơn thuốc</h1>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(212,168,83,0.1)', color: 'var(--gold-400)' }}>
                    {enabledCount}/{lensOptions.length} loại tròng đang bật
                </span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                Cấu hình loại tròng kính, cho phép khách nhập độ cận/loạn hoặc upload đơn kính
            </p>

            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    fontSize: 'var(--text-sm)', fontWeight: 600, animation: 'fadeIn 200ms ease',
                }}>{toast}</div>
            )}

            {/* Feature toggles */}
            <div className="zen-feature-toggles" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>📋 Nhập đơn kính</h3>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Cho phép khách nhập độ hoặc upload đơn</p>
                    </div>
                    <ToggleSwitch enabled={prescriptionEnabled} onToggle={() => { setPrescriptionEnabled(!prescriptionEnabled); showToast(`📋 Nhập đơn kính — ${!prescriptionEnabled ? 'Đã bật' : 'Đã tắt'}`); }} />
                </div>
                <div className="card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>🎁 Gợi ý combo</h3>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4 }}>Tăng AOV bằng gợi ý combo</p>
                    </div>
                    <ToggleSwitch enabled={comboEnabled} onToggle={() => { setComboEnabled(!comboEnabled); showToast(`🎁 Gợi ý combo — ${!comboEnabled ? 'Đã bật' : 'Đã tắt'}`); }} />
                </div>
            </div>

            {/* Lens Options */}
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Loại tròng kính</h2>
            <div className="zen-lens-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-4)' }}>
                {lensOptions.map((lens, i) => (
                    <div key={lens.id} className="card" style={{ padding: 'var(--space-5)', opacity: lens.enabled ? 1 : 0.55, transition: 'opacity 300ms ease' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-lg)', background: lens.enabled ? 'var(--gradient-gold)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'background 300ms ease' }}>{lens.icon}</div>
                                <div>
                                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{lens.name}</h3>
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>{lens.desc}</p>
                                </div>
                            </div>
                            <ToggleSwitch enabled={lens.enabled} onToggle={() => toggleLens(i)} />
                        </div>
                        <div className="divider" style={{ margin: 'var(--space-3) 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-sm)' }}>
                            <span style={{ color: 'var(--gold-400)', fontWeight: 600 }}>{fmtMoney(lens.price)}</span>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{lens.enabled ? '✅ Hiển thị' : '⏸️ Ẩn'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Prescription fields */}
            <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>📋 Trường đơn kính</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>Các trường khách hàng nhập khi đặt kính cận:</p>

                {/* Mobile card view for prescription fields */}
                <div className="zen-mobile-cards" style={{ gap: 'var(--space-2)' }}>
                    {PRESCRIPTION_FIELDS.map(row => (
                        <div key={row.field} style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-lg)' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{row.field}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-2)' }}>
                                <div>
                                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>OS/OD: </span>
                                    <code style={{ color: 'var(--gold-400)', fontSize: 13 }}>{row.example}</code>
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.note}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop table for prescription fields */}
                <div className="zen-table-desktop" style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                {['Trường', 'Mắt trái (OS)', 'Mắt phải (OD)', 'Ghi chú'].map(h => (
                                    <th key={h} style={{ textAlign: 'left', padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {PRESCRIPTION_FIELDS.map(row => (
                                <tr key={row.field} style={{ borderBottom: '1px solid var(--border-subtle, rgba(255,255,255,0.05))' }}>
                                    <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{row.field}</td>
                                    <td style={{ padding: 'var(--space-3)' }}><code style={{ color: 'var(--gold-400)' }}>{row.example}</code></td>
                                    <td style={{ padding: 'var(--space-3)' }}><code style={{ color: 'var(--gold-400)' }}>{row.example}</code></td>
                                    <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{row.note}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-3)' }}>
                    💡 Khách cũng có thể upload ảnh đơn kính thay vì nhập tay
                </p>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
