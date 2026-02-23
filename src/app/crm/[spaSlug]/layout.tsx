'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useState } from 'react';

const crmNav = [
    { icon: '📊', label: 'Dashboard', path: '' },
    { icon: '👥', label: 'Khách hàng', path: '/customers' },
    { icon: '💆', label: 'Dịch vụ', path: '/services' },
    { icon: '📅', label: 'Lịch hẹn', path: '/appointments' },
    { icon: '🧾', label: 'Phiếu thu', path: '/receipts' },
    { icon: '🧑‍💼', label: 'Nhân viên', path: '/staff' },
    { icon: '💰', label: 'Lương & HH', path: '/payroll' },
    { icon: '🤖', label: 'Trợ lý AI', path: '/ai-suite' },
    { icon: '📦', label: 'Modules', path: '/modules' },
    { icon: '🎯', label: 'Onboarding', path: '/onboarding' },
    { icon: '❓', label: 'Hướng dẫn', path: '/help' },
];

// Primary modules for Mobile Bottom Nav
const mobilePrimaryNav = [
    { icon: '📊', label: 'Home', path: '' },
    { icon: '📅', label: 'Lịch hẹn', path: '/appointments' },
    { icon: '🧾', label: 'Thu ngân', path: '/receipts' },
    { icon: '👥', label: 'Khách', path: '/customers' },
];

export default function CrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const params = useParams();
    const slug = params.spaSlug as string;
    const base = `/crm/${slug}`;

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="layout-portal">
            {/* Desktop Sidebar (hidden on mobile via global CSS) */}
            <aside className="sidebar">
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

            {/* Main Content Area */}
            <main className="main-content">
                {children}
            </main>

            {/* Mobile Menu Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: '70px',
                        backgroundColor: 'var(--bg-card)', zIndex: 999, overflowY: 'auto',
                        padding: '24px', animation: 'fadeInUp 0.3s ease'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h2 style={{ margin: 0 }}>Menu Mở Rộng</h2>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="btn btn-ghost" style={{ fontSize: '24px', padding: '0 8px' }}>&times;</button>
                    </div>
                    <div className="grid grid-2" style={{ gap: '12px' }}>
                        {crmNav.map(item => {
                            const href = base + item.path;
                            const isActive = item.path === '' ? pathname === base : pathname.startsWith(href);
                            return (
                                <Link
                                    key={item.path}
                                    href={href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    style={{
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px',
                                        background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-input)',
                                        border: isActive ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                                        borderRadius: 'var(--radius-md)', color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <span style={{ fontSize: '24px', marginBottom: '8px' }}>{item.icon}</span>
                                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{item.label}</span>
                                </Link>
                            );
                        })}
                    </div>
                    <div style={{ marginTop: '24px' }}>
                        <Link href="/dashboard" className="btn btn-secondary" style={{ width: '100%' }}>Quay lại Hub Portal</Link>
                    </div>
                </div>
            )}

            {/* Mobile Bottom Navigation (visible only on mobile via global CSS) */}
            <nav className="bottom-nav">
                {mobilePrimaryNav.map(item => {
                    const href = base + item.path;
                    const isActive = item.path === '' ? pathname === base : pathname.startsWith(href);
                    return (
                        <Link key={item.path} href={href} className={`bottom-nav-item ${isActive ? 'active' : ''}`} onClick={() => setIsMobileMenuOpen(false)}>
                            <span className="nav-icon">{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    );
                })}
                <button
                    className={`bottom-nav-item ${isMobileMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                    <span className="nav-icon">{isMobileMenuOpen ? '✖️' : '☰'}</span>
                    <span>Menu</span>
                </button>
            </nav>
        </div>
    );
}
