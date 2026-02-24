'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ROUTE_LABELS: Record<string, string> = {
    'hub': 'Hub',
    'workspaces': 'Không gian',
    'activity': 'Hoạt động',
    'settings': 'Cài đặt',
    'notifications': 'Thông báo',
    'account': 'Tài khoản',
    'billing': 'Thanh toán',
    'wallet': 'Ví tiền',
    'marketplace': 'Giải pháp',
    'help': 'Trợ giúp',
    'support': 'Hỗ trợ',
    'import': 'Import',
    'onboarding': 'Thiết lập',
    'admin': 'Admin',
    'emk-crm': 'CRM',
    'accounts': 'Tài khoản Hub',
    'tasks': 'Công việc',
    'analytics': 'Phân tích',
    'reports': 'Báo cáo',
    'templates': 'Mẫu email',
    'cms': 'Nội dung',
    'team': 'Nhóm',
    'affiliates': 'Đại lý',
    'logs': 'Nhật ký',
    'dashboard': 'Bảng điều khiển',
    'referrals': 'Giới thiệu',
    'payouts': 'Thanh toán HH',
    'topups': 'Nạp tiền',
    'users': 'Nhân sự',
    'health': 'Hệ thống',
    'timeline': 'Dòng thời gian',
    'changelog': 'Lịch sử cập nhật',
    'ai': 'Trung tâm AI',
};

export default function Breadcrumbs() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    // Don't show breadcrumbs on root or shallow pages
    if (segments.length <= 1) return null;

    const crumbs = segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = ROUTE_LABELS[seg] || (seg.length > 20 ? seg.slice(0, 8) + '…' : seg);
        const isLast = i === segments.length - 1;
        return { href, label, isLast };
    });

    return (
        <nav style={{
            display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap',
            fontSize: '12px', marginBottom: '12px', color: 'var(--text-muted)',
        }} aria-label="Breadcrumb">
            {crumbs.map((c, i) => (
                <span key={c.href} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {i > 0 && <span style={{ opacity: 0.5 }}>›</span>}
                    {c.isLast ? (
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{c.label}</span>
                    ) : (
                        <Link href={c.href} style={{
                            color: 'var(--text-muted)', textDecoration: 'none',
                            transition: 'color 150ms',
                        }}>{c.label}</Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
