'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';

const crmNav = [
    { icon: '📊', label: 'Dashboard', path: '' },
    { icon: '👥', label: 'Khách hàng', path: '/customers' },
    { icon: '💆', label: 'Dịch vụ', path: '/services' },
    { icon: '📅', label: 'Lịch hẹn', path: '/appointments' },
    { icon: '🧾', label: 'Phiếu thu', path: '/receipts' },
    { icon: '🧑‍💼', label: 'Nhân viên', path: '/staff' },
    { icon: '💰', label: 'Lương & HH', path: '/payroll' },
    { icon: '📦', label: 'Modules', path: '/modules' },
    { icon: '🎯', label: 'Onboarding', path: '/onboarding' },
    { icon: '❓', label: 'Hướng dẫn', path: '/help' },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const slug = params.spaSlug as string;
    const base = `/crm/${slug}`;

    return (
        <div className="layout-portal">
            <aside className="sidebar" style={{ background: 'linear-gradient(180deg, #0e1030 0%, #151540 100%)' }}>
                <div className="sidebar-logo">💆 Spa CRM</div>
                <div style={{
                    padding: '8px 24px 16px', fontSize: '12px', color: 'var(--text-muted)',
                    borderBottom: '1px solid var(--border)', marginBottom: '8px',
                }}>
                    {slug}
                </div>
                <nav>
                    <ul className="sidebar-nav">
                        {crmNav.map(item => {
                            const href = base + item.path;
                            const isActive = item.path === '' ? pathname === base : pathname.startsWith(href);
                            return (
                                <li key={item.path}>
                                    <Link href={href} className={isActive ? 'active' : ''}>
                                        <span className="nav-icon">{item.icon}</span>{item.label}
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>
                <div style={{ position: 'absolute', bottom: '16px', left: '24px', right: '24px' }}>
                    <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>← Hub Portal</Link>
                </div>
            </aside>
            <main className="main-content">{children}</main>
        </div>
    );
}
