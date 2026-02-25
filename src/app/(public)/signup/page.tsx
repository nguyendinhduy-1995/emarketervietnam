'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function SignupContent() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);
    const [form, setForm] = useState({ name: '', phone: '', password: '', email: '' });

    useEffect(() => { setMounted(true); }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Đã xảy ra lỗi'); setLoading(false); return; }
            // Redirect to Hub subdomain
            const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
            window.location.href = isProd ? 'https://hub.emarketervietnam.vn/hub' : '/hub';
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
            setLoading(false);
        }
    };

    return (
        <>
            <style>{`
                @keyframes signupFadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .signup-input:focus {
                    border-color: rgba(139, 92, 246, 0.6) !important;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12) !important;
                }
                .signup-input::placeholder { color: rgba(255,255,255,0.25); }
                .signup-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.35);
                }
                .signup-btn:active:not(:disabled) { transform: translateY(0); }
            `}</style>

            <div style={{
                minHeight: '100vh',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '24px',
                background: '#0a0a0f',
                position: 'relative', overflow: 'hidden',
            }}>
                {/* Gradient orbs */}
                <div style={{
                    position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                    top: '-200px', left: '-100px', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)',
                    bottom: '-150px', right: '-100px', pointerEvents: 'none',
                }} />

                <div style={{
                    width: '100%', maxWidth: '420px',
                    animation: mounted ? 'signupFadeIn 0.6s ease-out' : 'none',
                    opacity: mounted ? 1 : 0,
                }}>
                    {/* Brand */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            display: 'inline-flex', alignItems: 'center', gap: '10px',
                            marginBottom: '32px',
                        }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px',
                                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="white" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px', color: 'white' }}>
                                eMarketer
                            </span>
                        </div>
                        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: '0 0 8px', letterSpacing: '-0.5px' }}>
                            Tạo tài khoản miễn phí
                        </h1>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.5 }}>
                            Chỉ 30 giây — không cần thẻ tín dụng
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px', padding: '32px',
                        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                    }}>
                        {error && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
                                fontSize: '13px', lineHeight: 1.5,
                                background: 'rgba(239,68,68,0.1)', color: '#f87171',
                                border: '1px solid rgba(239,68,68,0.15)',
                            }}>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={labelStyle}>Họ và tên *</label>
                                <input
                                    className="signup-input"
                                    type="text"
                                    placeholder="Nguyễn Văn A"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                    required
                                    autoComplete="name"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Số điện thoại *</label>
                                <input
                                    className="signup-input"
                                    type="tel"
                                    placeholder="0901 234 567"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    required
                                    autoComplete="tel"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Mật khẩu *</label>
                                <input
                                    className="signup-input"
                                    type="password"
                                    placeholder="Tối thiểu 6 ký tự"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                    minLength={6}
                                    autoComplete="new-password"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>
                                    Email <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>(tùy chọn)</span>
                                </label>
                                <input
                                    className="signup-input"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={form.email}
                                    onChange={e => setForm({ ...form, email: e.target.value })}
                                    autoComplete="email"
                                    style={inputStyle}
                                />
                            </div>

                            <button
                                className="signup-btn"
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                    color: 'white', border: 'none',
                                    fontSize: '15px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit', letterSpacing: '0.2px',
                                    marginTop: '4px',
                                }}
                            >
                                {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
                        Đã có tài khoản?{' '}
                        <Link href="/login" style={{ color: '#a78bfa', fontWeight: 600, textDecoration: 'none' }}>
                            Đăng nhập
                        </Link>
                    </div>

                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '24px',
                        marginTop: '32px', fontSize: '11px', color: 'rgba(255,255,255,0.25)',
                    }}>
                        <span>🔒 Bảo mật AES-256</span>
                        <span>⚡ Multi-tenant</span>
                        <span>📱 PWA</span>
                    </div>
                </div>
            </div>
        </>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '13px', fontWeight: 500,
    color: 'rgba(255,255,255,0.6)', marginBottom: '8px', letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
    width: '100%', padding: '13px 16px', borderRadius: '12px',
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    color: 'white', fontSize: '15px', fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.2s, box-shadow 0.2s',
};

export default function SignupPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0f' }}>
                <div className="loading-spinner" />
            </div>
        }>
            <SignupContent />
        </Suspense>
    );
}
