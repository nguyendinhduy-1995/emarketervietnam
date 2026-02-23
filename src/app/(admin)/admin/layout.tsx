'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const adminNav = [
    { href: '/admin', icon: '📊', label: 'Admin Dashboard' },
    { href: '/admin/tenants', icon: '🏢', label: 'Tenants' },
    { href: '/admin/billing', icon: '💳', label: 'Billing Ops' },
    { href: '/admin/provisioning', icon: '⚙️', label: 'Provisioning' },
    { href: '/admin/modules', icon: '📦', label: 'Modules' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [ok, setOk] = useState(false);

    useEffect(() => {
        fetch('/api/auth/me').then(r => r.json()).then(d => {
            if (!d.user?.isAdmin) { router.push('/dashboard'); return; }
            setOk(true);
        }).catch(() => router.push('/login'));
    }, [router]);

    if (!ok) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}><div className="loading-spinner" /></div>;

    return (
        <div className="layout-portal">
            <aside className="sidebar" style={{ background: '#0d0d24' }}>
                <div className="sidebar-logo">🛡️ Admin Panel</div>
                <nav>
                    <ul className="sidebar-nav">
                        {adminNav.map(item => (
                            <li key={item.href}>
                                <Link href={item.href} className={pathname === item.href ? 'active' : ''}>
                                    <span className="nav-icon">{item.icon}</span>{item.label}
                                </Link>
                            </li>
                        ))}
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
