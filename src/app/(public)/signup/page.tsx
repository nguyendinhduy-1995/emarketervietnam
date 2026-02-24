'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        workspaceName: '',
        name: '',
        phone: '',
        password: '',
        email: '',
    });

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

            if (!res.ok) {
                setError(data.error || 'Đã xảy ra lỗi');
                return;
            }

            router.push(data.crmUrl + '/onboarding');
        } catch {
            setError('Lỗi kết nối. Vui lòng thử lại.');
        } finally {
            setLoading(false);
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '12px 16px', borderRadius: '12px',
        background: 'var(--bg-input)', border: '1px solid var(--border)',
        color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
        outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            minHeight: 'calc(100vh - 73px)', padding: '40px 20px',
        }}>
            <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '40px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>
                        Tạo tài khoản miễn phí
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                        Chỉ 30 giây – không cần thẻ tín dụng
                    </p>
                </div>

                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Tên doanh nghiệp *
                        </label>
                        <input
                            type="text"
                            placeholder="VD: Thẩm mỹ viện ABC"
                            value={form.workspaceName}
                            onChange={(e) => setForm({ ...form, workspaceName: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Họ tên *
                        </label>
                        <input
                            type="text"
                            placeholder="Nguyễn Văn A"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Số điện thoại *
                        </label>
                        <input
                            type="tel"
                            placeholder="0901234567"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            required
                            minLength={9}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Mật khẩu *
                        </label>
                        <input
                            type="password"
                            placeholder="Tối thiểu 6 ký tự"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required
                            minLength={6}
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                            Email <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(tùy chọn)</span>
                        </label>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            style={inputStyle}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            background: 'var(--accent-primary)', color: 'white', border: 'none',
                            fontSize: '15px', fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1, marginTop: '8px',
                            fontFamily: 'inherit', transition: 'opacity 200ms ease',
                        }}
                    >
                        {loading ? '⏳ Đang tạo...' : '🚀 Tạo tài khoản ngay'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Đã có tài khoản? <a href="/login" style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>Đăng nhập</a>
                </p>
            </div>
        </div>
    );
}
