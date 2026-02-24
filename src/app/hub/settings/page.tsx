'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useThemeContext } from '@/components/ThemeProvider';
import { useToast } from '@/components/ToastProvider';

interface Profile {
    name: string;
    email: string;
    phone: string | null;
    isAdmin: boolean;
}

export default function SettingsPage() {
    const { theme, setTheme } = useThemeContext();
    const { success, error: toastError } = useToast();

    const [profile, setProfile] = useState<Profile | null>(null);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [saving, setSaving] = useState(false);

    // Password
    const [showPwForm, setShowPwForm] = useState(false);
    const [oldPw, setOldPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [changingPw, setChangingPw] = useState(false);

    // Login activity
    const [loginEvents, setLoginEvents] = useState<Array<{ id: string; type: string; createdAt: string; payloadJson: Record<string, unknown> | null }>>([]);

    useEffect(() => {
        fetch('/api/hub/profile')
            .then(r => r.json())
            .then(d => {
                setProfile(d);
                setEditName(d.name || '');
                setEditPhone(d.phone || '');
            })
            .catch(() => { });
        fetch('/api/hub/login-activity')
            .then(r => r.json())
            .then(d => setLoginEvents(d.events || []))
            .catch(() => { });
    }, []);

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/hub/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: editName, phone: editPhone }),
            });
            if (res.ok) {
                const updated = await res.json();
                setProfile(prev => prev ? { ...prev, ...updated } : prev);
                success('Đã lưu hồ sơ!');
            } else {
                toastError('Không thể lưu');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setSaving(false);
    };

    const handleChangePassword = async () => {
        if (newPw !== confirmPw) { toastError('Mật khẩu xác nhận không khớp'); return; }
        if (newPw.length < 6) { toastError('Mật khẩu mới tối thiểu 6 ký tự'); return; }
        setChangingPw(true);
        try {
            const res = await fetch('/api/hub/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
            });
            const data = await res.json();
            if (res.ok) {
                success('Đã đổi mật khẩu!');
                setShowPwForm(false);
                setOldPw(''); setNewPw(''); setConfirmPw('');
            } else {
                toastError(data.error || 'Không thể đổi mật khẩu');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setChangingPw(false);
    };

    const themeOptions: Array<{ value: 'auto' | 'light' | 'dark'; icon: string; label: string }> = [
        { value: 'auto', icon: '🔄', label: 'Tự động' },
        { value: 'light', icon: '☀️', label: 'Sáng' },
        { value: 'dark', icon: '🌙', label: 'Tối' },
    ];

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '12px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };

    const sectionStyle: React.CSSProperties = {
        display: 'flex', flexDirection: 'column', gap: '10px',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Cài đặt</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Tuỳ chỉnh Hub theo sở thích</p>
            </div>

            {/* Hồ sơ */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Hồ sơ</h2>
                <div style={{
                    padding: '18px', borderRadius: '16px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tên</label>
                        <input value={editName} onChange={e => setEditName(e.target.value)} style={inputStyle} placeholder="Tên của bạn" />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Email</label>
                        <input value={profile?.email || ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Số điện thoại</label>
                        <input value={editPhone} onChange={e => setEditPhone(e.target.value)} style={inputStyle} placeholder="0901234567" />
                    </div>
                    <button onClick={handleSaveProfile} disabled={saving} style={{
                        padding: '12px', borderRadius: '12px', fontWeight: 700,
                        background: 'var(--accent-gradient)', border: 'none', color: 'white',
                        cursor: saving ? 'wait' : 'pointer', fontSize: '14px', fontFamily: 'inherit',
                        opacity: saving ? 0.6 : 1,
                    }}>
                        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                </div>
            </section>

            {/* Bảo mật */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Bảo mật</h2>
                {!showPwForm ? (
                    <button onClick={() => setShowPwForm(true)} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '16px 18px', borderRadius: '16px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: '15px',
                        color: 'var(--text-primary)', fontWeight: 500,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>🔒</span> Đổi mật khẩu
                        </div>
                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                    </button>
                ) : (
                    <div style={{
                        padding: '18px', borderRadius: '16px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        display: 'flex', flexDirection: 'column', gap: '12px',
                    }}>
                        <input type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} style={inputStyle} placeholder="Mật khẩu cũ" />
                        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} style={inputStyle} placeholder="Mật khẩu mới (tối thiểu 6 ký tự)" />
                        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} style={inputStyle} placeholder="Xác nhận mật khẩu mới" />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => setShowPwForm(false)} style={{
                                flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600,
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
                            }}>Huỷ</button>
                            <button onClick={handleChangePassword} disabled={changingPw} style={{
                                flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 700,
                                background: 'var(--accent-gradient)', border: 'none', color: 'white',
                                cursor: changingPw ? 'wait' : 'pointer', fontFamily: 'inherit', fontSize: '14px',
                                opacity: changingPw ? 0.6 : 1,
                            }}>
                                {changingPw ? 'Đang đổi…' : 'Đổi mật khẩu'}
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Giao diện */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Giao diện</h2>
                <div style={{ display: 'flex', gap: '6px', padding: '4px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {themeOptions.map(opt => (
                        <button key={opt.value} onClick={() => { setTheme(opt.value); success(`Đã chuyển: ${opt.label}`); }} style={{
                            flex: 1, padding: '12px', borderRadius: '10px', border: 'none',
                            background: theme === opt.value ? 'var(--accent-primary)' : 'transparent',
                            color: theme === opt.value ? 'white' : 'var(--text-muted)',
                            fontWeight: 600, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                            transition: 'all 150ms ease',
                        }}>
                            {opt.icon} {opt.label}
                        </button>
                    ))}
                </div>
            </section>

            {/* Login Activity */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🔐 Lịch sử đăng nhập
                </h2>
                {loginEvents.length === 0 ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '12px 0' }}>
                        Chưa có hoạt động đăng nhập nào được ghi nhận
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {loginEvents.slice(0, 8).map(event => {
                            const icons: Record<string, string> = { LOGIN: '🔑', 'AUTH:LOGIN': '🔑', LOGOUT: '🚪', 'AUTH:LOGOUT': '🚪', 'AUTH:TOKEN_VERIFY': '🔒' };
                            const labels: Record<string, string> = { LOGIN: 'Đăng nhập', 'AUTH:LOGIN': 'Đăng nhập', LOGOUT: 'Đăng xuất', 'AUTH:LOGOUT': 'Đăng xuất', 'AUTH:TOKEN_VERIFY': 'Xác thực' };
                            const diff = Date.now() - new Date(event.createdAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            const time = mins < 1 ? 'Vừa xong' : mins < 60 ? `${mins}p trước` : mins < 1440 ? `${Math.floor(mins / 60)}h trước` : `${Math.floor(mins / 1440)}d trước`;
                            return (
                                <div key={event.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '8px 12px', borderRadius: '10px',
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                }}>
                                    <span style={{ fontSize: '14px' }}>{icons[event.type] || '📌'}</span>
                                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{labels[event.type] || event.type}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{time}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Quick Links */}
            <section style={sectionStyle}>
                <h2 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Khác</h2>
                {[
                    { icon: '🔔', label: 'Thông báo', href: '/hub/settings/notifications', desc: 'Tuỳ chỉnh loại và tần suất thông báo' },
                    { icon: '👥', label: 'Thành viên', href: '/hub/settings/team', desc: 'Mời và quản lý thành viên' },
                    { icon: '📋', label: 'Nhật ký hoạt động', href: '/hub/settings/timeline', desc: 'Xem mọi thay đổi gần đây' },
                    { icon: '🆕', label: 'Có gì mới?', href: '/hub/settings/changelog', desc: 'Cập nhật và tính năng mới' },
                    ...(profile?.isAdmin ? [
                        { icon: '🩺', label: 'Tình trạng hệ thống', href: '/hub/settings/health', desc: 'Kiểm tra sức khoẻ nền tảng' },
                    ] : []),
                ].map(item => (
                    <Link key={item.href} href={item.href} style={{
                        display: 'flex', alignItems: 'center', gap: '14px',
                        padding: '16px 18px', borderRadius: '16px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        textDecoration: 'none', color: 'var(--text-primary)',
                        transition: 'all 150ms ease',
                    }}>
                        <span style={{ fontSize: '22px', flexShrink: 0 }}>{item.icon}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '1px' }}>{item.desc}</div>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>→</span>
                    </Link>
                ))}
            </section>
        </div>
    );
}
