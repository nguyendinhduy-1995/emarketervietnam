'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/smk/auth/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Đăng nhập thất bại');
                return;
            }

            // Get redirect URL or default to /admin
            const params = new URLSearchParams(window.location.search);
            const redirect = params.get('redirect') || '/smk-crm';
            router.push(redirect);
            router.refresh();
        } catch {
            setError('Không thể kết nối server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            background: 'linear-gradient(135deg, #0a0a0f 0%, #111827 50%, #0a0a0f 100%)',
        }}>
            <div className="card animate-in" style={{
                width: '100%',
                maxWidth: 420,
                padding: 'var(--space-8)',
                border: '1px solid var(--border-primary)',
                boxShadow: '0 25px 50px rgba(0,0,0,0.5), 0 0 100px rgba(212,168,83,0.05)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <div style={{
                        width: 64, height: 64, borderRadius: 'var(--radius-xl)',
                        background: 'linear-gradient(135deg, var(--gold-400), var(--gold-600))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-4)',
                        fontSize: 28, boxShadow: '0 8px 24px rgba(212,168,83,0.3)',
                    }}>
                        🔐
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: 'var(--text-2xl)',
                        fontWeight: 800,
                        background: 'var(--gradient-gold)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}>
                        SMK Quản trị ✦
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                        Đăng nhập vào hệ thống quản trị
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(239,68,68,0.1)',
                        border: '1px solid rgba(239,68,68,0.2)',
                        color: 'var(--error)',
                        fontSize: 'var(--text-sm)',
                        marginBottom: 'var(--space-4)',
                        textAlign: 'center',
                    }}>
                        ❌ {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            📧 Email
                        </label>
                        <input
                            className="input"
                            type="email"
                            placeholder="admin@sieuthimatkinh.vn"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                            autoComplete="email"
                            style={{ fontSize: 'var(--text-base)' }}
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <label style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            fontWeight: 600,
                            display: 'block',
                            marginBottom: 6,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            🔑 Mật khẩu
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                style={{ fontSize: 'var(--text-base)', paddingRight: 44 }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 18, opacity: 0.5,
                                }}
                            >
                                {showPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        type="submit"
                        disabled={loading || !email || !password}
                        style={{
                            width: '100%',
                            fontSize: 'var(--text-base)',
                            fontWeight: 700,
                            height: 48,
                            letterSpacing: '0.02em',
                        }}
                    >
                        {loading ? (
                            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                <span className="spinner" style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                                Đang xác thực...
                            </span>
                        ) : (
                            '🚀 Đăng nhập'
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div style={{
                    marginTop: 'var(--space-6)',
                    textAlign: 'center',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                }}>
                    <p>Hệ thống quản trị Siêu Thị Mắt Kính</p>
                    <p style={{ marginTop: 4, opacity: 0.5 }}>© 2026 Hệ thống quản trị SMK</p>
                </div>
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
