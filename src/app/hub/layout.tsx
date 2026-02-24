'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useThemeContext } from '@/components/ThemeProvider';
import SolutionSuggestion from '@/components/SolutionSuggestion';
import Breadcrumbs from '@/components/Breadcrumbs';
import AiChatWidget from '@/components/AiChatWidget';
import AnalyticsTracker from '@/components/AnalyticsTracker';
import SearchModal from '@/components/SearchModal';

const navItems = [
    { href: '/hub', label: 'Tổng quan', exact: true },
    { href: '/hub/marketplace', label: 'Sản phẩm', exact: false },
    { href: '/hub/account', label: 'Tài khoản', exact: false },
    { href: '/hub/notifications', label: 'Thông báo', exact: false },
];

// SVG icons for nav
function NavIcon({ type, active }: { type: string; active: boolean }) {
    const color = active ? 'var(--accent-primary)' : 'var(--text-muted)';
    const size = 22;
    switch (type) {
        case 'Tổng quan': return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
        );
        case 'Sản phẩm': return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
        );
        case 'Tài khoản': return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
        );
        case 'Thông báo': return (
            <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
        );
        default: return null;
    }
}

// Professional theme toggle icons
function ThemeIcon({ theme }: { theme: string }) {
    const s = 18;
    if (theme === 'dark') return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
    if (theme === 'light') return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
    // auto
    return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" opacity="0.4" /><path d="M21 12.79A9 9 0 0 1 12 21" opacity="0.4" />
        </svg>
    );
}

interface AuthUser { id: string; name: string; phone: string; email?: string | null }

export default function HubLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { theme, setTheme } = useThemeContext();
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);

    // Check auth state
    useEffect(() => {
        fetch('/api/auth/me')
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => { if (d.user) setUser(d.user); setAuthChecked(true); })
            .catch(() => setAuthChecked(true));
    }, []);

    const cycleTheme = () => {
        const modes: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark'];
        const idx = modes.indexOf(theme);
        setTheme(modes[(idx + 1) % modes.length]);
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        setUser(null);
        setShowUserMenu(false);
        window.location.href = '/login';
    };

    const themeLabel = theme === 'dark' ? 'Tối' : theme === 'light' ? 'Sáng' : 'Tự động';
    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            {/* Top Bar */}
            <header style={{
                position: 'sticky', top: 0, zIndex: 50,
                padding: '12px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                borderBottom: '1px solid var(--border)',
            }}>
                <Link href="/hub" style={{
                    fontWeight: 700, fontSize: '17px', letterSpacing: '-0.3px',
                    color: 'var(--accent-primary)', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-primary)" />
                    </svg>
                    eMarketer Hub
                </Link>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {/* Search */}
                    <button onClick={() => { const e = new KeyboardEvent('keydown', { key: 'k', metaKey: true }); window.dispatchEvent(e); }} style={{
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                    }} aria-label="Tìm kiếm" title="Tìm kiếm (⌘K)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </button>
                    {/* Theme toggle */}
                    <button onClick={cycleTheme} style={{
                        width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                        cursor: 'pointer', color: 'var(--text-secondary)',
                    }} aria-label={`Chế độ: ${themeLabel}`} title={`Chế độ: ${themeLabel}`}>
                        <ThemeIcon theme={theme} />
                    </button>

                    {/* Auth buttons */}
                    {authChecked && !user && (
                        <>
                            <Link href="/login" style={{
                                padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                color: 'var(--text-secondary)', textDecoration: 'none',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                transition: 'all 200ms',
                            }}>
                                Đăng nhập
                            </Link>
                            <Link href="/signup" style={{
                                padding: '7px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                color: 'white', textDecoration: 'none',
                                background: 'var(--accent-primary)', border: 'none',
                                transition: 'all 200ms',
                            }}>
                                Đăng ký
                            </Link>
                        </>
                    )}

                    {/* User avatar + menu */}
                    {authChecked && user && (
                        <div style={{ position: 'relative' }}>
                            <button onClick={() => setShowUserMenu(!showUserMenu)} style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                color: 'white', border: 'none', cursor: 'pointer',
                                fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }} title={user.name}>
                                {initials}
                            </button>
                            {showUserMenu && (
                                <>
                                    <div onClick={() => setShowUserMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />
                                    <div style={{
                                        position: 'absolute', right: 0, top: '44px', zIndex: 99,
                                        minWidth: '200px', borderRadius: '14px', overflow: 'hidden',
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                                    }}>
                                        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{user.name}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{user.phone}</div>
                                            {user.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>}
                                        </div>
                                        <Link href="/hub/account" onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '10px 16px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 150ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            👤 Tài khoản
                                        </Link>
                                        <Link href="/hub/settings" onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '10px 16px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 150ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            ⚙️ Cài đặt
                                        </Link>
                                        <Link href="/hub/wallet" onClick={() => setShowUserMenu(false)} style={{ display: 'block', padding: '10px 16px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none', transition: 'background 150ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(99,102,241,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                            💰 Ví tiền
                                        </Link>
                                        <div style={{ borderTop: '1px solid var(--border)' }}>
                                            <button onClick={handleLogout} style={{ width: '100%', padding: '10px 16px', fontSize: '13px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', transition: 'background 150ms' }} onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.05)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                                🚪 Đăng xuất
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1, padding: '16px', paddingBottom: '88px',
                maxWidth: '800px', margin: '0 auto', width: '100%',
                boxSizing: 'border-box',
            }}>
                <Breadcrumbs />
                <SolutionSuggestion />
                {children}
            </main>

            {/* Bottom Nav — 4 items, beautiful design */}
            <nav style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                background: 'var(--bg-glass)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                borderTop: '1px solid var(--border)', height: '68px',
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}>
                {navItems.map(item => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href);
                    return (
                        <Link key={item.href} href={item.href} style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center',
                            gap: '3px', padding: '6px 12px', borderRadius: '12px',
                            textDecoration: 'none',
                            color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                            background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                            transition: 'all 200ms ease',
                        }}>
                            <NavIcon type={item.label} active={isActive} />
                            <span style={{
                                fontSize: '10px', fontWeight: isActive ? 700 : 500,
                                letterSpacing: '0.2px',
                            }}>
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>


            <SearchModal />
            <AiChatWidget layer="hub" currentPage={pathname} />
            <AnalyticsTracker layer="hub" />
        </div>
    );
}
