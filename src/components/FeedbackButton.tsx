'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

const FEEDBACK_TYPES = [
    { key: 'bug', icon: '🐛', label: 'Báo lỗi' },
    { key: 'feature', icon: '💡', label: 'Đề xuất' },
    { key: 'general', icon: '💬', label: 'Góp ý khác' },
];

export default function FeedbackButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [type, setType] = useState('general');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const pathname = usePathname();
    const { success, error: toastError } = useToast();

    const handleSubmit = async () => {
        if (!message.trim()) { toastError('Vui lòng nhập nội dung'); return; }
        setSending(true);
        try {
            const res = await fetch('/api/hub/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, message, page: pathname }),
            });
            const data = await res.json();
            if (res.ok) {
                success('Cảm ơn bạn đã góp ý! 💖');
                setMessage('');
                setIsOpen(false);
            } else {
                toastError(data.error || 'Không gửi được');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setSending(false);
    };

    return (
        <>
            {/* FAB button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    style={{
                        position: 'fixed', bottom: '80px', right: '16px', zIndex: 999,
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'var(--accent-gradient)', border: 'none',
                        color: 'white', fontSize: '20px', cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(99,102,241,0.4)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'transform 150ms ease',
                    }}
                    aria-label="Góp ý"
                    title="Góp ý"
                >
                    💬
                </button>
            )}

            {/* Feedback form overlay */}
            {isOpen && (
                <>
                    <div
                        onClick={() => setIsOpen(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.3)', zIndex: 998,
                            animation: 'fadeIn 150ms ease',
                        }}
                    />
                    <div style={{
                        position: 'fixed', bottom: '80px', right: '16px', zIndex: 999,
                        width: 'calc(100% - 32px)', maxWidth: '360px',
                        padding: '20px', borderRadius: '20px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        display: 'flex', flexDirection: 'column', gap: '14px',
                        animation: 'slideUp 200ms ease',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '16px' }}>Góp ý</h3>
                            <button onClick={() => setIsOpen(false)} style={{
                                background: 'none', border: 'none', fontSize: '18px',
                                cursor: 'pointer', color: 'var(--text-muted)', padding: '4px',
                            }}>✕</button>
                        </div>

                        {/* Type selector */}
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {FEEDBACK_TYPES.map(t => (
                                <button key={t.key} onClick={() => setType(t.key)} style={{
                                    flex: 1, padding: '8px', borderRadius: '10px',
                                    background: type === t.key ? 'var(--accent-primary)' : 'var(--bg-input)',
                                    color: type === t.key ? 'white' : 'var(--text-muted)',
                                    border: '1px solid var(--border)', fontSize: '12px',
                                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'all 150ms ease',
                                }}>
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Message */}
                        <textarea
                            autoFocus value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="Mô tả chi tiết..."
                            rows={3}
                            style={{
                                width: '100%', padding: '12px 14px', borderRadius: '12px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit',
                                outline: 'none', resize: 'vertical', minHeight: '80px',
                            }}
                        />

                        {/* Context info */}
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            📍 Trang hiện tại: {pathname}
                        </div>

                        <button onClick={handleSubmit} disabled={sending} style={{
                            width: '100%', padding: '12px', borderRadius: '12px',
                            background: 'var(--accent-gradient)', border: 'none',
                            color: 'white', fontWeight: 700, fontSize: '14px',
                            cursor: sending ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: sending ? 0.6 : 1, boxShadow: 'var(--shadow-glow)',
                        }}>
                            {sending ? 'Đang gửi…' : 'Gửi góp ý'}
                        </button>
                    </div>
                </>
            )}

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </>
    );
}
