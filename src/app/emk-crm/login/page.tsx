'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CrmLoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ phone: '', password: '' });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/emk-crm/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Đã xảy ra lỗi'); return; }
            const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
            window.location.href = isProd ? 'https://crm.emarketervietnam.vn/emk-crm' : '/emk-crm';
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', padding: '40px 20px',
            background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #0f0f23 100%)',
            color: '#e2e8f0',
        }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 16px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)',
                    }}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
                        </svg>
                    </div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px', letterSpacing: '-0.5px' }}>eMk-CRM</h1>
                    <p style={{ fontSize: '14px', color: '#94a3b8' }}>Hệ thống quản lý nội bộ</p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px',
                        background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            placeholder="09xxxxxxxx"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            required
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e2e8f0', fontSize: '15px', fontFamily: 'inherit',
                                outline: 'none', boxSizing: 'border-box',
                                transition: 'border-color 200ms',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: '#94a3b8' }}>
                            Mật khẩu
                        </label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                            required
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                                color: '#e2e8f0', fontSize: '15px', fontFamily: 'inherit',
                                outline: 'none', boxSizing: 'border-box',
                                transition: 'border-color 200ms',
                            }}
                            onFocus={e => e.currentTarget.style.borderColor = '#6366f1'}
                            onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '14px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)', color: 'white', border: 'none',
                        fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1, transition: 'all 200ms ease',
                        fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
                    }}>
                        {loading ? 'Đang xác thực...' : 'Đăng nhập CRM →'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px', color: '#475569' }}>
                    🔒 Chỉ dành cho nhân viên eMarketer
                </p>
            </div>
        </div>
    );
}
