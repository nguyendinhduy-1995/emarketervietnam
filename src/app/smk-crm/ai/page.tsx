'use client';

import { useState } from 'react';

interface AIFeature {
    name: string;
    desc: string;
    endpoint: string;
    enabled: boolean;
    usage: string;
    icon: string;
}

const INITIAL_FEATURES: AIFeature[] = [
    {
        name: 'AI Stylist Chat',
        desc: 'Tư vấn kính tự động bằng chatbot AI. Phát hiện ý định từ tiếng Việt (khuôn mặt, phong cách, ngân sách) và gợi ý sản phẩm phù hợp.',
        endpoint: '/api/ai/stylist',
        enabled: true,
        usage: '124 cuộc hội thoại',
        icon: '🤖',
    },
    {
        name: 'Personalization Engine',
        desc: 'Gợi ý sản phẩm dựa trên lịch sử xem, mua hàng và xu hướng. Tự động cá nhân hoá trang chủ cho mỗi người dùng.',
        endpoint: '/api/ai/personalize',
        enabled: true,
        usage: '856 API calls/ngày',
        icon: '🎯',
    },
    {
        name: 'Visual Search',
        desc: 'Tìm kiếm sản phẩm bằng hình ảnh. Upload ảnh kính → phân tích frame shape, material → trả kết quả matching.',
        endpoint: '/api/ai/visual-search',
        enabled: true,
        usage: '45 searches/ngày',
        icon: '📸',
    },
    {
        name: 'Content Generator',
        desc: 'Tạo caption, script video TikTok, mẫu review, story slides tự động từ thông tin sản phẩm. Hỗ trợ 3 tone và 4 platform.',
        endpoint: '/api/ai/content-gen',
        enabled: true,
        usage: '67 nội dung tạo',
        icon: '✍️',
    },
    {
        name: 'AR Try-On',
        desc: 'Thử kính ảo bằng camera hoặc ảnh. Phát hiện khuôn mặt, overlay gọng kính, gợi ý theo face shape.',
        endpoint: '/try-on',
        enabled: true,
        usage: '312 lần thử',
        icon: '🪞',
    },
    {
        name: 'Smart Restock',
        desc: 'Phân tích tốc độ bán → dự đoán ngày hết hàng → gợi ý số lượng nhập thêm. Tích hợp trong trang Kho hàng.',
        endpoint: '/api/ai/restock',
        enabled: true,
        usage: 'Real-time',
        icon: '📦',
    },
    {
        name: 'Auto-Categorize Returns',
        desc: 'AI đọc lý do đổi trả → tự phân loại (lỗi sản phẩm / đổi ý / sai size / bảo hành) → gợi ý approve/reject.',
        endpoint: '/api/ai/categorize-return',
        enabled: true,
        usage: 'Real-time',
        icon: '↩️',
    },
    {
        name: 'Customer Insights',
        desc: 'Phân tích hành vi mua → dự đoán churn risk, gợi ý upsell, đánh giá lifetime value cho từng khách.',
        endpoint: '/api/ai/customer-insights',
        enabled: true,
        usage: 'On-demand',
        icon: '🧠',
    },
    {
        name: 'Smart SEO Writer',
        desc: 'AI sinh meta title, description, keywords tối ưu cho Google.vn. Hỗ trợ tiếng Việt, tích hợp trang SEO.',
        endpoint: '/api/ai/seo-writer',
        enabled: true,
        usage: 'On-demand',
        icon: '🔍',
    },
    {
        name: 'Fraud AI Analyzer',
        desc: 'Phân tích pattern đơn hàng bất thường của đối tác → risk score + giải thích chi tiết. Nâng cấp rule-based.',
        endpoint: '/api/ai/fraud-analyze',
        enabled: true,
        usage: 'On-demand',
        icon: '🛡️',
    },
    {
        name: 'Auto Reply Support',
        desc: 'AI đọc ticket CSKH → phát hiện intent → gợi ý câu trả lời dựa trên chính sách shop. Copy 1 click.',
        endpoint: '/api/ai/support-reply',
        enabled: true,
        usage: 'On-demand',
        icon: '💬',
    },
    {
        name: 'Sales Forecast',
        desc: 'Phân tích 30 ngày doanh thu → dự đoán 7 ngày tới → trend up/down/stable. Dashboard widget.',
        endpoint: '/api/ai/forecast',
        enabled: true,
        usage: 'Real-time',
        icon: '📊',
    },
];

function ToggleSwitch({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            aria-label={enabled ? 'Tắt tính năng' : 'Bật tính năng'}
            style={{
                width: 48,
                height: 26,
                borderRadius: 13,
                border: 'none',
                cursor: 'pointer',
                padding: 2,
                background: enabled
                    ? 'linear-gradient(135deg, var(--gold-400), var(--gold-600))'
                    : 'var(--bg-tertiary)',
                transition: 'background 250ms ease',
                flexShrink: 0,
                position: 'relative',
            }}
        >
            <span
                style={{
                    display: 'block',
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: enabled ? '#fff' : 'var(--text-muted)',
                    transform: enabled ? 'translateX(22px)' : 'translateX(0)',
                    transition: 'transform 250ms ease, background 250ms ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
            />
        </button>
    );
}

export default function AdminAIPage() {
    const [features, setFeatures] = useState<AIFeature[]>(INITIAL_FEATURES);
    const [toast, setToast] = useState<string | null>(null);

    const toggleFeature = (index: number) => {
        setFeatures((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], enabled: !updated[index].enabled };
            const f = updated[index];
            setToast(`${f.icon} ${f.name} — ${f.enabled ? 'Đã bật' : 'Đã tắt'}`);
            setTimeout(() => setToast(null), 2500);
            return updated;
        });
    };

    const activeCount = features.filter((f) => f.enabled).length;

    return (
        <div className="animate-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>AI & Knowledge Base</h1>
                <span style={{
                    fontSize: 'var(--text-xs)', fontWeight: 600, padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(212,168,83,0.1)', color: 'var(--gold-400)',
                }}>
                    {activeCount}/{features.length} tính năng đang bật
                </span>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-6)' }}>
                Quản lý các tính năng AI trong hệ thống — bật/tắt từng tính năng theo nhu cầu
            </p>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 999,
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    fontSize: 'var(--text-sm)', fontWeight: 600,
                    animation: 'fadeIn 200ms ease',
                }}>
                    {toast}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-3)' }}>
                {features.map((f, i) => (
                    <div
                        key={f.name}
                        className="card"
                        style={{
                            padding: 'var(--space-5)',
                            opacity: f.enabled ? 1 : 0.55,
                            transition: 'opacity 300ms ease',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 'var(--radius-lg)',
                                background: f.enabled ? 'var(--gradient-gold)' : 'var(--bg-tertiary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 22, flexShrink: 0,
                                transition: 'background 300ms ease',
                            }}>
                                {f.icon}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                                    <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600 }}>{f.name}</h3>
                                    <ToggleSwitch enabled={f.enabled} onToggle={() => toggleFeature(i)} />
                                </div>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>{f.desc}</p>
                            </div>
                        </div>

                        <div className="divider" style={{ margin: 'var(--space-3) 0' }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)' }}>
                            <code style={{ color: 'var(--gold-400)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
                                {f.endpoint}
                            </code>
                            <span style={{ color: 'var(--text-muted)' }}>
                                {f.enabled ? `📊 ${f.usage}` : '⏸️ Đã tắt'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Knowledge Base */}
            <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-6)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>📚 Knowledge Base</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    Dữ liệu huấn luyện AI Stylist và Personalization
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-3)' }}>
                    {[
                        { label: 'Sản phẩm', value: '8' },
                        { label: 'Face shapes', value: '5' },
                        { label: 'Frame shapes', value: '8' },
                        { label: 'Materials', value: '7' },
                        { label: 'Style tags', value: '12' },
                        { label: 'Intent patterns', value: '25+' },
                    ].map((d) => (
                        <div key={d.label} style={{ padding: 'var(--space-3)', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                            <p style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--gold-400)' }}>{d.value}</p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{d.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
