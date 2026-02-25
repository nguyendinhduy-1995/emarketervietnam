'use client';
import { useState } from 'react';
import { useToast } from '@/components/ToastProvider';

const industries = [
    { key: 'SPA', icon: '💆', label: 'Spa & Thẩm mỹ', desc: 'Chăm sóc da, massage, nails' },
    { key: 'SALON', icon: '💇', label: 'Tiệm tóc', desc: 'Cắt, nhuộm, uốn, duỗi' },
    { key: 'CLINIC', icon: '🏥', label: 'Phòng khám', desc: 'Y tế, nha khoa, TM nội khoa' },
    { key: 'SALES', icon: '💼', label: 'Bán hàng', desc: 'Quản lý đơn hàng, kho' },
    { key: 'PERSONAL', icon: '👤', label: 'Cá nhân', desc: 'Freelancer, 1 người' },
];

const goals = [
    { key: 'APPOINTMENTS', icon: '📅', label: 'Tăng lịch hẹn', desc: 'Nhiều khách đặt hẹn hơn mỗi ngày' },
    { key: 'REVENUE', icon: '💰', label: 'Tăng doanh thu', desc: 'Theo dõi đơn hàng và chốt nhanh hơn' },
    { key: 'SOLO', icon: '🧑', label: 'Quản lý 1 mình', desc: 'Gọn nhẹ, đủ dùng, không phức tạp' },
];

const STEPS = [
    { title: 'Ngành nghề', icon: '🏢' },
    { title: 'Mục tiêu', icon: '🎯' },
    { title: 'Không gian', icon: '🚀' },
];

export default function OnboardingPage() {
    const [step, setStep] = useState(0);
    const [industry, setIndustry] = useState('');
    const [goal, setGoal] = useState('');
    const [name, setName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [slideDir, setSlideDir] = useState<'left' | 'right'>('left');
    const { success: toastSuccess, error: toastError } = useToast();

    const goStep = (next: number) => {
        setSlideDir(next > step ? 'left' : 'right');
        setStep(next);
    };

    const handleCreate = async () => {
        if (!name.trim()) { setError('Vui lòng nhập tên'); return; }
        setLoading(true);
        setError('');
        try {
            const wsRes = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, product: industry || 'SPA' }),
            });
            const wsData = await wsRes.json();
            if (!wsRes.ok) { setError(wsData.error || 'Có lỗi xảy ra'); setLoading(false); return; }



            toastSuccess('Đã tạo không gian làm việc! 🎉');
            // Show product recommendations instead of immediate redirect
            setStep(3);
        } catch {
            setError('Không thể kết nối server');
            toastError('Lỗi kết nối');
            setLoading(false);
        }
    };

    // Product recommendations based on industry
    const getRecommendations = () => {
        const recs: { icon: string; name: string; desc: string; slug: string }[] = [];
        if (['SPA', 'SALON', 'CLINIC'].includes(industry)) {
            recs.push({ icon: '💆', name: 'CRM Spa Pro', desc: 'Quản lý khách, đặt lịch, loyalty tự động', slug: 'crm-spa-pro' });
        }
        recs.push({ icon: '🤖', name: 'AI Content Creator', desc: 'Tạo nội dung marketing bằng AI, nhanh x10', slug: 'app-ai-content' });
        recs.push({ icon: '📚', name: 'Tài liệu Marketing A-Z', desc: 'Học thực chiến, template sẵn dùng', slug: 'digital-marketing-guide' });
        return recs;
    };

    return (
        <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <style>{`
                @keyframes obSlideIn { from { opacity: 0; transform: translateX(var(--slide-from)); } to { opacity: 1; transform: translateX(0); } }
                @keyframes obPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                .ob-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.15) !important; }
                .ob-card { transition: all 200ms ease !important; }
            `}</style>

            {/* Welcome header */}
            <div style={{ textAlign: 'center', padding: '8px 0 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px', animation: 'obPulse 2s ease-in-out infinite' }}>⚡</div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px' }}>Thiết lập nhanh</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Chỉ 3 bước · dưới 2 phút</p>
            </div>

            {/* Step indicator dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', padding: '4px 0' }}>
                {STEPS.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: i <= step ? '16px' : '12px',
                            fontWeight: 800,
                            background: i < step ? 'var(--accent-primary)' : i === step
                                ? 'linear-gradient(135deg, var(--accent-primary), #818cf8)' : 'var(--bg-input)',
                            color: i <= step ? 'white' : 'var(--text-muted)',
                            border: i === step ? '2px solid rgba(99,102,241,0.3)' : '2px solid transparent',
                            transition: 'all 300ms ease',
                            boxShadow: i === step ? '0 0 12px rgba(99,102,241,0.3)' : 'none',
                        }}>
                            {i < step ? '✓' : s.icon}
                        </div>
                        {i < STEPS.length - 1 && (
                            <div style={{
                                width: '40px', height: '2px', borderRadius: '1px',
                                background: i < step ? 'var(--accent-primary)' : 'var(--border)',
                                transition: 'background 300ms ease',
                            }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Step 0: Chọn ngành */}
            {step === 0 && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    animation: 'obSlideIn 300ms ease', ['--slide-from' as string]: slideDir === 'left' ? '24px' : '-24px',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Bạn làm trong ngành nào?</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                        Chúng tôi sẽ cá nhân hóa trải nghiệm cho bạn
                    </p>
                    {industries.map(ind => (
                        <button key={ind.key} className="ob-card"
                            onClick={() => { setIndustry(ind.key); goStep(1); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '16px 18px', borderRadius: '16px',
                                background: industry === ind.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                                color: industry === ind.key ? 'white' : 'var(--text-primary)',
                                border: industry === ind.key ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                cursor: 'pointer', fontSize: '15px', fontWeight: 600, fontFamily: 'inherit',
                                textAlign: 'left', minHeight: '56px',
                            }}
                        >
                            <span style={{ fontSize: '26px', flexShrink: 0 }}>{ind.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700 }}>{ind.label}</div>
                                <div style={{ fontSize: '12px', opacity: 0.65, fontWeight: 400, marginTop: '1px' }}>{ind.desc}</div>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Step 1: Chọn mục tiêu */}
            {step === 1 && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    animation: 'obSlideIn 300ms ease', ['--slide-from' as string]: slideDir === 'left' ? '24px' : '-24px',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Mục tiêu chính của bạn?</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 4px' }}>
                        Chọn mục tiêu quan trọng nhất để chúng tôi gợi ý sản phẩm
                    </p>
                    {goals.map(g => (
                        <button key={g.key} className="ob-card"
                            onClick={() => { setGoal(g.key); goStep(2); }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '18px', borderRadius: '16px',
                                background: goal === g.key ? 'var(--accent-primary)' : 'var(--bg-card)',
                                color: goal === g.key ? 'white' : 'var(--text-primary)',
                                border: goal === g.key ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', minHeight: '64px',
                            }}
                        >
                            <span style={{ fontSize: '28px', flexShrink: 0 }}>{g.icon}</span>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '15px' }}>{g.label}</div>
                                <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '2px', fontWeight: 400 }}>{g.desc}</div>
                            </div>
                        </button>
                    ))}
                    <button onClick={() => goStep(0)} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        cursor: 'pointer', fontSize: '14px', padding: '12px', fontFamily: 'inherit',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                    }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                        Quay lại
                    </button>
                </div>
            )}

            {/* Step 2: Tên + Seed + Tạo */}
            {step === 2 && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    animation: 'obSlideIn 300ms ease', ['--slide-from' as string]: slideDir === 'left' ? '24px' : '-24px',
                }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Đặt tên không gian làm việc</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '-8px 0 0' }}>
                        Đây là tên hiển thị của workspace
                    </p>

                    <input
                        type="text" autoFocus value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder={industry === 'SALES' ? 'VD: Cửa hàng Hoa Sen' : industry === 'CLINIC' ? 'VD: Phòng khám Dr. Nguyên' : 'VD: Spa Hương Sen'}
                        style={{
                            width: '100%', padding: '14px 16px', borderRadius: '14px',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: '16px', fontFamily: 'inherit',
                            outline: 'none', boxSizing: 'border-box',
                        }}
                    />



                    {/* Summary card */}
                    <div style={{
                        padding: '14px 16px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.06), rgba(139,92,246,0.06))',
                        border: '1px solid rgba(99,102,241,0.15)',
                        fontSize: '14px',
                    }}>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tổng kết
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Ngành</span>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {industries.find(i => i.key === industry)?.icon} {industries.find(i => i.key === industry)?.label || industry}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Mục tiêu</span>
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {goals.find(g => g.key === goal)?.icon} {goals.find(g => g.key === goal)?.label || goal}
                            </span>
                        </div>
                    </div>

                    {error && (
                        <p style={{ color: 'var(--danger)', fontSize: '14px', textAlign: 'center', margin: 0 }}>{error}</p>
                    )}

                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => goStep(1)} style={{
                            flex: 1, padding: '14px', borderRadius: '14px', fontWeight: 600,
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '15px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                            Quay lại
                        </button>
                        <button onClick={handleCreate} disabled={loading} style={{
                            flex: 2, padding: '14px', borderRadius: '14px', fontWeight: 700,
                            background: 'var(--accent-gradient)', border: 'none',
                            color: 'white', cursor: loading ? 'wait' : 'pointer',
                            fontFamily: 'inherit', fontSize: '15px',
                            opacity: loading ? 0.6 : 1,
                            boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                        }}>
                            {loading ? 'Đang tạo…' : 'Tạo không gian 🚀'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Product Recommendations */}
            {step === 3 && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '16px',
                    animation: 'obSlideIn 300ms ease', ['--slide-from' as string]: '24px',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                        <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>Workspace đã sẵn sàng!</h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                            Khám phá sản phẩm phù hợp cho {industries.find(i => i.key === industry)?.label}
                        </p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {getRecommendations().map(rec => (
                            <a key={rec.slug} href={`/hub/marketplace/${rec.slug}`} className="ob-card" style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                padding: '16px', borderRadius: '16px', textDecoration: 'none',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', boxShadow: 'var(--shadow-sm)',
                            }}>
                                <span style={{ fontSize: '32px' }}>{rec.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{rec.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{rec.desc}</div>
                                </div>
                                <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>→</span>
                            </a>
                        ))}
                    </div>

                    <button onClick={() => { window.location.href = '/hub'; }} style={{
                        padding: '14px', borderRadius: '14px', fontWeight: 700, fontSize: '15px',
                        background: 'var(--accent-gradient)', color: 'white', border: 'none',
                        cursor: 'pointer', fontFamily: 'inherit', boxShadow: 'var(--shadow-glow)',
                    }}>
                        Vào Hub →
                    </button>

                    <button onClick={() => { window.location.href = '/hub/marketplace'; }} style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', padding: '4px',
                    }}>
                        Xem tất cả sản phẩm →
                    </button>
                </div>
            )}
        </div>
    );
}

