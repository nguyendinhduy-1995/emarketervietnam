'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface UpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const plans = [
    {
        key: 'FREE',
        name: 'Miễn phí',
        price: '0₫',
        period: 'mãi mãi',
        features: [
            '1 không gian làm việc',
            'Quản lý khách hàng cơ bản',
            'Lịch hẹn cơ bản',
            'Tối đa 50 khách hàng',
        ],
        cta: null,
        highlight: false,
    },
    {
        key: 'PRO',
        name: 'Chuyên nghiệp',
        price: '299.000₫',
        period: '/tháng',
        features: [
            'Không giới hạn không gian',
            'Tất cả modules CRM',
            'Hoa hồng & Bảng lương',
            'Không giới hạn khách hàng',
            'Phân tích & Báo cáo',
            'Hỗ trợ ưu tiên',
        ],
        cta: 'Chọn gói Pro',
        highlight: true,
    },
];

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { success, error: toastError } = useToast();

    if (!isOpen) return null;

    const handleSelectPro = async () => {
        setLoading(true);
        try {
            // Create an order for the PRO plan (main CRM module)
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [{ moduleKey: 'CRM', months: 1 }] }),
            });
            const data = await res.json();
            if (data.order) {
                success('Đã tạo đơn nâng cấp!');
                onClose();
                router.push(`/billing/orders/${data.order.id}`);
            } else {
                toastError(data.error || 'Không thể tạo đơn');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setLoading(false);
    };

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    zIndex: 9998,
                    animation: 'fadeIn 200ms ease',
                }}
            />
            {/* Modal */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0,
                maxHeight: '90vh', overflowY: 'auto',
                background: 'var(--bg-primary)',
                borderRadius: '24px 24px 0 0',
                padding: '24px 20px 40px',
                zIndex: 9999,
                animation: 'slideUp 300ms ease',
            }}>
                {/* Handle */}
                <div style={{
                    width: '40px', height: '4px', borderRadius: '2px',
                    background: 'var(--border)', margin: '0 auto 20px',
                }} />

                <h2 style={{ fontSize: '22px', fontWeight: 800, textAlign: 'center', marginBottom: '4px' }}>
                    Nâng cấp tài khoản
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '24px' }}>
                    Mở khoá tất cả tính năng cho đội ngũ
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {plans.map(plan => (
                        <div key={plan.key} style={{
                            padding: '20px', borderRadius: '18px',
                            background: 'var(--bg-card)',
                            border: plan.highlight
                                ? '2px solid var(--accent-primary)'
                                : '1px solid var(--border)',
                            boxShadow: plan.highlight ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
                            position: 'relative',
                        }}>
                            {plan.highlight && (
                                <span style={{
                                    position: 'absolute', top: '-10px', right: '16px',
                                    padding: '4px 12px', borderRadius: '20px',
                                    background: 'var(--accent-gradient)', color: 'white',
                                    fontSize: '11px', fontWeight: 700,
                                }}>
                                    Phổ biến nhất
                                </span>
                            )}
                            <div style={{ marginBottom: '12px' }}>
                                <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{plan.name}</div>
                                <div>
                                    <span style={{ fontSize: '28px', fontWeight: 800, color: plan.highlight ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                                        {plan.price}
                                    </span>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{plan.period}</span>
                                </div>
                            </div>
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {plan.features.map((f, i) => (
                                    <li key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            {plan.cta && (
                                <button
                                    onClick={handleSelectPro}
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '14px',
                                        background: 'var(--accent-gradient)', border: 'none',
                                        color: 'white', fontWeight: 700, fontSize: '15px',
                                        cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
                                        boxShadow: 'var(--shadow-glow)',
                                        opacity: loading ? 0.6 : 1,
                                    }}
                                >
                                    {loading ? 'Đang xử lý…' : plan.cta}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button onClick={onClose} style={{
                    width: '100%', padding: '14px', marginTop: '12px',
                    borderRadius: '14px', border: '1px solid var(--border)',
                    background: 'none', color: 'var(--text-muted)',
                    fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
                }}>
                    Để sau
                </button>
            </div>

            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
}
