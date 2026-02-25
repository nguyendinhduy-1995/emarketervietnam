'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function getRedirectUrl(callbackUrl: string | null): string {
    const isProd = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    if (callbackUrl?.startsWith('/emk-crm') || callbackUrl?.startsWith('/crm')) {
        return isProd ? `https://crm.emarketervietnam.vn${callbackUrl}` : (callbackUrl || '/hub');
    }
    // Default: redirect to Hub subdomain
    const path = callbackUrl || '/hub';
    return isProd ? `https://hub.emarketervietnam.vn${path}` : path;
}

function LoginContent() {
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ phone: '', password: '' });
    const [mounted, setMounted] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // Handle magic link / token login
    useEffect(() => {
        const token = searchParams.get('token');
        if (token) {
            setLoading(true);
            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
            })
                .then(r => r.json())
                .then(data => {
                    if (data.user) {
                        window.location.href = getRedirectUrl(searchParams.get('callbackUrl'));
                    } else {
                        setError(data.error || 'Liên kết đã hết hạn');
                        setLoading(false);
                    }
                })
                .catch(() => { setError('Lỗi xác thực'); setLoading(false); });
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Đã xảy ra lỗi'); setLoading(false); return; }
            window.location.href = getRedirectUrl(searchParams.get('callbackUrl'));
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
            setLoading(false);
        }
    };

    if (loading && searchParams.get('token')) {
        return (
            <div style={styles.fullCenter}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>Đang xác thực...</p>
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes loginFadeIn {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes loginShimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                .login-input:focus {
                    border-color: rgba(139, 92, 246, 0.6) !important;
                    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.12) !important;
                }
                .login-input::placeholder { color: rgba(255,255,255,0.25); }
                .login-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 25px rgba(139, 92, 246, 0.35);
                }
                .login-btn:active:not(:disabled) { transform: translateY(0); }
            `}</style>

            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                background: '#0a0a0f',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Subtle gradient orbs */}
                <div style={{
                    position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
                    top: '-200px', right: '-100px', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                    bottom: '-150px', left: '-100px', pointerEvents: 'none',
                }} />

                <div style={{
                    width: '100%',
                    maxWidth: '420px',
                    animation: mounted ? 'loginFadeIn 0.6s ease-out' : 'none',
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
                            <span style={{
                                fontSize: '20px', fontWeight: 700, letterSpacing: '-0.5px',
                                color: 'white',
                            }}>
                                eMarketer
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: '28px', fontWeight: 700, color: 'white',
                            margin: '0 0 8px', letterSpacing: '-0.5px',
                        }}>
                            Chào mừng trở lại
                        </h1>
                        <p style={{
                            fontSize: '15px', color: 'rgba(255,255,255,0.45)',
                            margin: 0, lineHeight: 1.5,
                        }}>
                            Đăng nhập để quản lý doanh nghiệp
                        </p>
                    </div>

                    {/* Card */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '20px',
                        padding: '32px',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
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

                        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 500,
                                    color: 'rgba(255,255,255,0.6)', marginBottom: '8px',
                                    letterSpacing: '0.3px',
                                }}>
                                    Số điện thoại
                                </label>
                                <input
                                    className="login-input"
                                    type="tel"
                                    placeholder="0901 234 567"
                                    value={form.phone}
                                    onChange={e => setForm({ ...form, phone: e.target.value })}
                                    required
                                    autoComplete="tel"
                                    style={styles.input}
                                />
                            </div>
                            <div>
                                <label style={{
                                    display: 'block', fontSize: '13px', fontWeight: 500,
                                    color: 'rgba(255,255,255,0.6)', marginBottom: '8px',
                                    letterSpacing: '0.3px',
                                }}>
                                    Mật khẩu
                                </label>
                                <input
                                    className="login-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                    autoComplete="current-password"
                                    style={styles.input}
                                />
                            </div>

                            <button
                                className="login-btn"
                                type="submit"
                                disabled={loading}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '14px',
                                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                    color: 'white', border: 'none',
                                    fontSize: '15px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'inherit',
                                    letterSpacing: '0.2px',
                                    marginTop: '4px',
                                }}
                            >
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </button>
                        </form>
                    </div>

                    {/* Footer */}
                    <div style={{
                        textAlign: 'center', marginTop: '28px',
                        fontSize: '14px', color: 'rgba(255,255,255,0.4)',
                    }}>
                        Chưa có tài khoản?{' '}
                        <Link href="/signup" style={{
                            color: '#a78bfa', fontWeight: 600,
                            textDecoration: 'none',
                            transition: 'color 0.2s',
                        }}>
                            Đăng ký miễn phí
                        </Link>
                    </div>

                    {/* Trust bar */}
                    <div style={{
                        display: 'flex', justifyContent: 'center', gap: '24px',
                        marginTop: '32px', fontSize: '11px',
                        color: 'rgba(255,255,255,0.25)',
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

const styles: Record<string, React.CSSProperties> = {
    fullCenter: {
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#0a0a0f',
    },
    input: {
        width: '100%', padding: '13px 16px', borderRadius: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'white', fontSize: '15px', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box' as const,
        transition: 'border-color 0.2s, box-shadow 0.2s',
    },
};

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={styles.fullCenter}>
                <div className="loading-spinner" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
