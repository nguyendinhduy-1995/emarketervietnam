'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({ phone: '', password: '' });

    // Handle token-based login from URL (magic link / landing form)
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
                        router.push('/hub');
                    } else {
                        setError(data.error || 'Liên kết đã hết hạn');
                        setLoading(false);
                    }
                })
                .catch(() => { setError('Lỗi xác thực'); setLoading(false); });
        }
    }, [searchParams, router]);

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
            if (!res.ok) { setError(data.error || 'Đã xảy ra lỗi'); return; }
            const callback = searchParams.get('callbackUrl');
            router.push(callback || '/hub');
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    if (loading && searchParams.get('token')) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 16px' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>Đang xác thực...</p>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: 'calc(100vh - 73px)', padding: '40px 20px',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
        }}>
            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Đăng nhập</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Truy cập Hub quản lý doanh nghiệp
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '12px 16px', borderRadius: '12px', marginBottom: '16px', fontSize: '13px',
                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Số điện thoại
                        </label>
                        <input
                            type="tel"
                            placeholder="0901234567"
                            value={form.phone}
                            onChange={e => setForm({ ...form, phone: e.target.value })}
                            required
                            style={{
                                width: '100%', padding: '12px 16px', borderRadius: '12px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
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
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
                                outline: 'none', boxSizing: 'border-box',
                            }}
                        />
                    </div>
                    <button type="submit" disabled={loading} style={{
                        width: '100%', padding: '14px', borderRadius: '12px',
                        background: 'var(--accent-primary)', color: 'white', border: 'none',
                        fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                        opacity: loading ? 0.7 : 1, transition: 'opacity 200ms ease',
                        fontFamily: 'inherit',
                    }}>
                        {loading ? 'Đang đăng nhập...' : 'Đăng nhập →'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    Chưa có tài khoản? <a href="/signup" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Đăng ký miễn phí</a>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)' }}>
                <div className="loading-spinner" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
