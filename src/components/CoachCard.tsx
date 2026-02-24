'use client';

interface CoachTip {
    icon: string;
    title: string;
    subtitle: string;
    href: string;
}

interface CoachCardProps {
    hasCompletedOnboarding: boolean;
    hasWorkspaces: boolean;
    taskCount: number;
}

export default function CoachCard({ hasCompletedOnboarding, hasWorkspaces, taskCount }: CoachCardProps) {
    let tip: CoachTip | null = null;

    // Priority-based coaching logic
    if (!hasCompletedOnboarding) {
        tip = {
            icon: '🚀',
            title: 'Thiết lập không gian làm việc',
            subtitle: 'Hoàn thành chỉ 2 phút để bắt đầu',
            href: '/hub/onboarding',
        };
    } else if (!hasWorkspaces) {
        tip = {
            icon: '🏢',
            title: 'Tạo không gian đầu tiên',
            subtitle: 'Nơi quản lý tất cả dữ liệu của bạn',
            href: '/hub/onboarding',
        };
    } else if (taskCount === 0) {
        tip = {
            icon: '🛒',
            title: 'Khám phá sản phẩm',
            subtitle: 'Tìm gói dịch vụ phù hợp cho bạn',
            href: '/hub/marketplace',
        };
    } else {
        // No tip needed – user is active
        return null;
    }

    return (
        <a href={tip.href} style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '16px 18px', borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
            border: '1px solid rgba(99,102,241,0.15)',
            textDecoration: 'none', color: 'var(--text-primary)',
            transition: 'all 150ms ease',
        }}>
            <span style={{
                fontSize: '28px', flexShrink: 0,
                width: '44px', height: '44px', borderRadius: '14px',
                background: 'rgba(99,102,241,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                {tip.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>
                    💡 {tip.title}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {tip.subtitle}
                </div>
            </div>
            <span style={{ fontSize: '16px', color: 'var(--text-muted)', flexShrink: 0 }}>→</span>
        </a>
    );
}
