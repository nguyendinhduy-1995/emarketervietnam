'use client';
import { useState, useEffect } from 'react';

interface RegisterFormProps {
    formTitle: string;
    landingSlug?: string;
}

export default function RegisterForm({ formTitle, landingSlug }: RegisterFormProps) {
    const [form, setForm] = useState({
        name: '', phone: '', _hp: ''
    });
    const [utm, setUtm] = useState({ utmSource: '', utmCampaign: '', utmMedium: '' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const p = new URLSearchParams(window.location.search);
            setUtm({
                utmSource: p.get('utm_source') || '',
                utmCampaign: p.get('utm_campaign') || '',
                utmMedium: p.get('utm_medium') || '',
            });
        }
    }, []);

    const handleSubmit = async () => {
        if (!form.name || !form.phone) { setError('Vui lòng nhập họ tên và số điện thoại'); return; }
        if (form._hp) return; // honeypot

        setSubmitting(true);
        setError('');
        try {
            const res = await fetch('/api/landing/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, landingSlug, ...utm })
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error || 'Có lỗi xảy ra'); setSubmitting(false); return; }
            if (data.loginToken) {
                window.location.href = `/thank-you?token=${data.loginToken}`;
            } else {
                window.location.href = '/thank-you';
            }
        } catch {
            setError('Không thể kết nối server');
            setSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-6 rounded-2xl"
            style={{ background: 'var(--bg-card)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border)' }}>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{formTitle}</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Tạo tài khoản miễn phí, dùng thử 14 ngày</p>

            <div className="space-y-4">
                <label className="block">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Họ và tên *</span>
                    <input
                        type="text" required autoFocus
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        className="mt-1 w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        placeholder="Nguyễn Văn A"
                    />
                </label>
                <label className="block">
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Số điện thoại *</span>
                    <input
                        type="tel" required
                        value={form.phone}
                        onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                        className="mt-1 w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        style={{ background: 'var(--bg-input)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                        placeholder="0901 234 567"
                    />
                </label>
            </div>

            {/* Honeypot - hidden */}
            <input type="text" name="_hp" value={form._hp} onChange={e => setForm(f => ({ ...f, _hp: e.target.value }))}
                style={{ position: 'absolute', left: '-9999px' }} tabIndex={-1} autoComplete="off" />

            {error && <p className="mt-3 text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}

            <button type="button" onClick={handleSubmit} disabled={submitting}
                className="w-full mt-6 py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
                style={{ background: 'var(--accent-primary)' }}>
                {submitting ? 'Đang tạo tài khoản...' : 'Đăng ký miễn phí ✨'}
            </button>
        </div>
    );
}
