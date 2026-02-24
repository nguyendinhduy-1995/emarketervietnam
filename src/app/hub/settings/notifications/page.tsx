'use client';
import { useEffect, useState, useCallback } from 'react';

interface Prefs {
    notifBilling: boolean;
    notifTask: boolean;
    notifSystem: boolean;
    notifUpdate: boolean;
    notifPromo: boolean;
    digestMode: string;
    quietStart: string | null;
    quietEnd: string | null;
}

const TOGGLES: Array<{ key: keyof Prefs; icon: string; label: string; desc: string }> = [
    { key: 'notifBilling', icon: '💰', label: 'Thanh toán', desc: 'Hóa đơn, gia hạn, thay đổi gói' },
    { key: 'notifTask', icon: '✅', label: 'Công việc', desc: 'Task mới, quá hạn, được gán' },
    { key: 'notifSystem', icon: '⚙️', label: 'Hệ thống', desc: 'Bảo trì, bảo mật, cập nhật quan trọng' },
    { key: 'notifUpdate', icon: '🔔', label: 'Tính năng mới', desc: 'Changelog, tính năng mới, cải tiến' },
    { key: 'notifPromo', icon: '🎉', label: 'Khuyến mãi', desc: 'Ưu đãi, giảm giá, sự kiện đặc biệt' },
];

const DIGEST_OPTIONS = [
    { value: 'INSTANT', label: 'Ngay lập tức', desc: 'Nhận thông báo khi có' },
    { value: 'DAILY', label: 'Hàng ngày', desc: 'Gom 1 lần/ngày lúc 8:00' },
    { value: 'WEEKLY', label: 'Hàng tuần', desc: 'Gom 1 lần/tuần vào Thứ 2' },
];

export default function NotifPrefsPage() {
    const [prefs, setPrefs] = useState<Prefs | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/hub/notifications/preferences').then(r => r.json())
            .then(d => { setPrefs(d.preferences); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const save = useCallback(async (updates: Partial<Prefs>) => {
        if (!prefs) return;
        const newPrefs = { ...prefs, ...updates };
        setPrefs(newPrefs);
        setSaving(true);
        await fetch('/api/hub/notifications/preferences', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    }, [prefs]);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: '64px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'npPulse 1.5s ease-in-out infinite' }} />)}
            <style>{`@keyframes npPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    if (!prefs) return <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Không thể tải cài đặt</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>🔔 Cài đặt thông báo</h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Tùy chỉnh cách nhận thông báo</p>
                </div>
                {(saving || saved) && (
                    <span style={{ fontSize: '12px', fontWeight: 600, color: saved ? '#22c55e' : 'var(--text-muted)', transition: 'all 200ms' }}>
                        {saving ? '⏳ Đang lưu…' : '✅ Đã lưu'}
                    </span>
                )}
            </div>

            {/* Toggle notifications */}
            <div style={{ borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)' }}>
                    Loại thông báo
                </div>
                {TOGGLES.map((t, i) => (
                    <div key={t.key} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderBottom: i < TOGGLES.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{t.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{t.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.desc}</div>
                            </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
                            <input type="checkbox" checked={prefs[t.key] as boolean}
                                onChange={e => save({ [t.key]: e.target.checked })}
                                style={{ opacity: 0, width: 0, height: 0 }} />
                            <span style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                borderRadius: '24px', transition: 'all 200ms ease',
                                background: prefs[t.key] ? 'var(--accent-primary)' : 'var(--bg-input)',
                                border: `1px solid ${prefs[t.key] ? 'var(--accent-primary)' : 'var(--border)'}`,
                            }}>
                                <span style={{
                                    position: 'absolute', left: prefs[t.key] ? '22px' : '2px', top: '2px',
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: 'white', transition: 'all 200ms ease',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                }} />
                            </span>
                        </label>
                    </div>
                ))}
            </div>

            {/* Digest mode */}
            <div style={{ borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', color: 'var(--text-muted)' }}>
                    Tần suất
                </div>
                <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {DIGEST_OPTIONS.map(opt => (
                        <label key={opt.value} onClick={() => save({ digestMode: opt.value })}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 8px',
                                borderRadius: '10px', cursor: 'pointer',
                                background: prefs.digestMode === opt.value ? 'rgba(99,102,241,0.06)' : 'transparent',
                                transition: 'all 150ms ease',
                            }}>
                            <div style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                border: `2px solid ${prefs.digestMode === opt.value ? 'var(--accent-primary)' : 'var(--border)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                {prefs.digestMode === opt.value && (
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                                )}
                            </div>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{opt.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{opt.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Quiet hours */}
            <div style={{ borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🌙 Giờ im lặng
                    <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--text-muted)' }}>— Tắt thông báo trong khoảng thời gian</span>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Từ</label>
                        <input type="time" value={prefs.quietStart || ''} onChange={e => save({ quietStart: e.target.value || null })}
                            style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}
                        />
                    </div>
                    <span style={{ paddingTop: '16px', color: 'var(--text-muted)' }}>→</span>
                    <div style={{ flex: 1 }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Đến</label>
                        <input type="time" value={prefs.quietEnd || ''} onChange={e => save({ quietEnd: e.target.value || null })}
                            style={{ width: '100%', padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
