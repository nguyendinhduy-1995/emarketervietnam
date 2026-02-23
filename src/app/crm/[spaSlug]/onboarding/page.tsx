'use client';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CrmOnboardingPage() {
    const { spaSlug } = useParams();
    const slug = spaSlug as string;

    const steps = [
        { icon: '💆', title: 'Thiết lập dịch vụ', desc: 'Thêm các dịch vụ Spa của bạn vào menu', href: `/crm/${slug}/services`, done: false },
        { icon: '👥', title: 'Thêm nhân viên', desc: 'Mời nhân viên vào workspace để phối hợp', href: '/users', done: false },
        { icon: '📅', title: 'Tạo lịch hẹn đầu tiên', desc: 'Đặt lịch cho khách hàng đầu tiên', href: `/crm/${slug}/appointments`, done: false },
        { icon: '🧾', title: 'Tạo phiếu thu', desc: 'Ghi nhận thanh toán và doanh thu', href: `/crm/${slug}/receipts`, done: false },
        { icon: '📊', title: 'Xem báo cáo', desc: 'Khám phá Dashboard và theo dõi hiệu quả', href: `/crm/${slug}`, done: false },
    ];

    return (
        <div>
            <div className="page-header" style={{ textAlign: 'center' }}>
                <h1>🎯 Onboarding</h1>
                <p>5 bước để bắt đầu sử dụng Spa CRM hiệu quả</p>
            </div>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {steps.map((step, i) => (
                    <Link key={i} href={step.href} style={{ textDecoration: 'none', color: 'var(--text-primary)' }}>
                        <div className={`checklist-item ${step.done ? 'done' : ''}`}>
                            <div className="check-icon">{step.done ? '✓' : step.icon}</div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '2px' }}>
                                    Bước {i + 1}: {step.title}
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{step.desc}</div>
                            </div>
                            <span style={{ color: 'var(--accent-secondary)', fontSize: '18px' }}>→</span>
                        </div>
                    </Link>
                ))}
            </div>
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
                <Link href={`/crm/${slug}/help`} className="btn btn-secondary">
                    📚 Xem hướng dẫn chi tiết
                </Link>
            </div>
        </div>
    );
}
