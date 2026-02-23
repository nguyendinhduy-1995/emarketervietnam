'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface UserData {
    user: { id: string; email: string; name: string; isAdmin: boolean };
    workspaces: Array<{
        id: string; name: string; slug: string; role: string; status: string;
        subscription: { planKey: string; status: string; currentPeriodEnd: string | null } | null;
        instance: { status: string; baseUrl: string } | null;
    }>;
}

const navItems = [
    { href: '/dashboard', icon: '📊', label: 'Dashboard' },
    { href: '/workspaces', icon: '🏢', label: 'Workspaces' },
    { href: '/apps', icon: '📱', label: 'Apps' },
    { href: '/marketplace', icon: '🛒', label: 'Marketplace' },
    { href: '/billing', icon: '💳', label: 'Billing' },
    { href: '/users', icon: '👥', label: 'Users & Roles' },
    { href: '/ai-vault', icon: '🔐', label: 'AI Vault' },
    { href: '/help', icon: '❓', label: 'Help Center' },
];

export default function PortalLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((r) => r.json())
            .then((data) => {
                if (data.error) {
                    router.push('/login');
                    return;
                }
                setUserData(data);
            })
            .catch(() => router.push('/login'));
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/me', { method: 'DELETE' });
        router.push('/login');
    };

    if (!userData) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    const ws = userData.workspaces[0];

    return (
        <div className="layout-portal">
            <aside className="sidebar">
                <div className="sidebar-logo">⚡ eMarketer Hub</div>

                {ws && (
                    <div style={{
                        padding: '12px 24px', margin: '0 12px 16px', borderRadius: 'var(--radius-sm)',
                        background: 'var(--bg-card)', fontSize: '13px',
                    }}>
                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{ws.name}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{ws.slug}</div>
                    </div>
                )}

                <nav>
                    <ul className="sidebar-nav">
                        {navItems.map((item) => (
                            <li key={item.href}>
                                <Link
                                    href={item.href}
                                    className={pathname === item.href ? 'active' : ''}
                                >
                                    <span className="nav-icon">{item.icon}</span>
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>

                {/* CRM Link */}
                {ws?.instance?.status === 'ACTIVE' && (
                    <div style={{ padding: '16px 24px', marginTop: '16px' }}>
                        <Link
                            href={process.env.NODE_ENV === 'production' ? `https://crmspa.emarketervietnam.vn/${ws.slug}` : `http://crmspa.localhost:3000/${ws.slug}`}
                            className="btn btn-primary"
                            style={{ width: '100%', fontSize: '13px' }}
                        >
                            🚀 Mở Spa CRM
                        </Link>
                    </div>
                )}

                {/* User info */}
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    padding: '16px 24px', borderTop: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                        {userData.user.name}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        {userData.user.email}
                    </div>
                    <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                        Đăng xuất
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
