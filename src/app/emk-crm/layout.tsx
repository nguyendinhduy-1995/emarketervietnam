'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import AiChatWidget from '@/components/AiChatWidget';
import Breadcrumbs from '@/components/Breadcrumbs';
import { IfFeature } from '@/components/FeatureGate';
import { EntitlementProvider } from '@/hooks/useEntitlement';
import DemoCTA from '@/components/DemoCTA';

// SVG Icon component for CRM
function CrmIcon({ name, size = 18, color = 'currentColor' }: { name: string; size?: number; color?: string }) {
    const s = size;
    const props = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

    switch (name) {
        case 'overview': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>;
        case 'dashboard': return <svg {...props}><path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" /></svg>;
        case 'leads': return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>;
        case 'accounts': return <svg {...props}><path d="M3 21h18" /><path d="M5 21V7l8-4v18" /><path d="M19 21V11l-6-4" /><path d="M9 9h1" /><path d="M9 13h1" /><path d="M9 17h1" /></svg>;
        case 'tasks': return <svg {...props}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
        case 'team': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
        case 'affiliates': return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>;
        case 'ai': return <svg {...props}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} stroke="none" /></svg>;
        case 'analytics': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
        case 'wallets': return <svg {...props}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
        case 'topups': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
        case 'products': return <svg {...props}><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>;
        case 'cms': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>;
        case 'logs': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
        case 'reports': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
        case 'back': return <svg {...props}><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>;
        case 'menu': return <svg {...props}><line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" /></svg>;
        case 'close': return <svg {...props}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
        case 'more': return <svg {...props}><circle cx="12" cy="12" r="1" fill={color} /><circle cx="19" cy="12" r="1" fill={color} /><circle cx="5" cy="12" r="1" fill={color} /></svg>;
        case 'shield': return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
        case 'finance': return <svg {...props}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
        case 'estudio': return <svg {...props}><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" /></svg>;
        case 'chevron-down': return <svg {...props}><polyline points="6 9 12 15 18 9" /></svg>;
        case 'chevron-right': return <svg {...props}><polyline points="9 18 15 12 9 6" /></svg>;
        case 'digital': return <svg {...props}><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
        case 'app': return <svg {...props}><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12" y2="18" /></svg>;
        default: return null;
    }
}

// ── Sidebar groups & labels ──
const SIDEBAR_GROUPS = [
    { key: 'workspace', label: 'Bàn làm việc' },
    { key: 'manage', label: 'Quản lý' },
    { key: 'ops', label: 'Vận hành' },
    { key: 'reports', label: 'Báo cáo' },
    { key: 'products', label: 'Sản phẩm' },
];

const sidebarItems = [
    // ── Bàn làm việc ──
    { href: '/emk-crm', icon: 'overview', label: 'Tổng quan', exact: true, group: 'workspace', featureKey: null },
    { href: '/emk-crm/dashboard', icon: 'dashboard', label: 'Bảng điều khiển', exact: false, group: 'workspace', featureKey: null },
    { href: '/emk-crm/tasks', icon: 'tasks', label: 'Công việc', exact: false, group: 'workspace', featureKey: null },

    // ── Quản lý ──
    { href: '/emk-crm/accounts', icon: 'accounts', label: 'Tài khoản Hub', exact: false, group: 'manage', featureKey: null },
    { href: '/emk-crm/users', icon: 'shield', label: 'Nhân sự CRM', exact: false, group: 'manage', featureKey: null },
    { href: '/emk-crm/tenants', icon: 'accounts', label: 'Quản lý đơn vị', exact: false, group: 'manage', featureKey: null },
    { href: '/emk-crm/affiliates', icon: 'affiliates', label: 'Đại lý & Hoa hồng', exact: false, group: 'manage', featureKey: 'AFFILIATES' },

    // ── Vận hành ──
    { href: '/emk-crm/topups', icon: 'topups', label: 'Nạp tiền', exact: false, group: 'ops', featureKey: null },
    { href: '/emk-crm/finance', icon: 'finance', label: 'Tài chính', exact: false, group: 'ops', featureKey: 'FINANCE_ADMIN' },
    { href: '/emk-crm/ai', icon: 'ai', label: 'Trung tâm AI', exact: false, group: 'ops', featureKey: 'AI_SETTINGS' },
    { href: '/emk-crm/cms', icon: 'cms', label: 'Nội dung (CMS)', exact: false, group: 'ops', featureKey: 'CMS' },

    // ── Báo cáo ──
    { href: '/emk-crm/saas-dashboard', icon: 'analytics', label: 'Chỉ số SaaS', exact: false, group: 'reports', featureKey: null },
    { href: '/emk-crm/analytics', icon: 'analytics', label: 'Phân tích', exact: false, group: 'reports', featureKey: null },
    { href: '/emk-crm/reports', icon: 'reports', label: 'Báo cáo', exact: false, group: 'reports', featureKey: null },
    { href: '/emk-crm/audit-logs', icon: 'logs', label: 'Nhật ký Admin', exact: false, group: 'reports', featureKey: null },
    { href: '/emk-crm/logs', icon: 'logs', label: 'Nhật ký hệ thống', exact: false, group: 'reports', featureKey: null },

    // ── Sản phẩm ──
    // CRM sub-group
    { href: '/emk-crm/products', icon: 'products', label: 'CRM đã kích hoạt', exact: true, group: 'products', subGroup: 'crm', featureKey: null },
    // APP sub-group
    { href: '/emk-crm/estudio', icon: 'estudio', label: 'eStudio', exact: false, group: 'products', subGroup: 'app', featureKey: null },
    // Digital sub-group
    { href: '/emk-crm/products/digital', icon: 'digital', label: 'Quản lý SP số', exact: false, group: 'products', subGroup: 'digital', featureKey: null },
];

const mobileNav = [
    { href: '/emk-crm', icon: 'overview', label: 'Tổng quan', exact: true },
    { href: '/emk-crm/accounts', icon: 'accounts', label: 'Tài khoản', exact: false },
    { href: '/emk-crm/topups', icon: 'topups', label: 'Nạp tiền', exact: false },
    { href: '/emk-crm/tasks', icon: 'tasks', label: 'Việc', exact: false },
    { href: '/emk-crm/users', icon: 'shield', label: 'Nhân sự', exact: false },
];

interface AuthUser { id: string; name: string; phone: string; email?: string | null }

export default function EmkCrmLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false); // for animation
    const [user, setUser] = useState<AuthUser | null>(null);
    const [authChecked, setAuthChecked] = useState(false);
    // Product sub-sections expand state
    const [expandedProductSubs, setExpandedProductSubs] = useState<Record<string, boolean>>({});

    // Check CRM auth state — redirect to login if not authenticated
    useEffect(() => {
        if (pathname === '/emk-crm/login') { setAuthChecked(true); return; }
        fetch('/api/emk-crm/auth/me')
            .then(r => { if (!r.ok) throw new Error(); return r.json(); })
            .then(d => {
                if (d.user) { setUser(d.user); setAuthChecked(true); }
                else { window.location.href = '/emk-crm/login'; }
            })
            .catch(() => {
                window.location.href = '/emk-crm/login';
            });
    }, [pathname]);

    // Animate menu open/close
    useEffect(() => {
        if (menuOpen) {
            setMenuVisible(true);
        } else {
            const t = setTimeout(() => setMenuVisible(false), 300);
            return () => clearTimeout(t);
        }
    }, [menuOpen]);

    const closeMenu = () => setMenuOpen(false);

    const handleLogout = async () => {
        await fetch('/api/emk-crm/auth/logout', { method: 'POST' });
        setUser(null);
        window.location.href = '/emk-crm/login';
    };

    // CRM login page renders without layout chrome
    if (pathname === '/emk-crm/login') {
        return <>{children}</>;
    }

    // Show loading while checking auth
    if (!authChecked) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    const initials = user?.name ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

    return (
        <EntitlementProvider>
            <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
                {/* Desktop Sidebar */}
                <aside className="crm-sidebar" style={{
                    width: '250px', flexShrink: 0, padding: '20px 12px',
                    background: 'var(--bg-card)', borderRight: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '2px',
                    position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
                }}>
                    <Link href="/emk-crm" style={{
                        fontWeight: 800, fontSize: '17px', color: 'var(--accent-primary)',
                        padding: '14px 14px 20px', textDecoration: 'none', letterSpacing: '-0.3px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                    }}>
                        <CrmIcon name="ai" size={20} color="var(--accent-primary)" /> eMk-CRM
                    </Link>

                    {SIDEBAR_GROUPS.map(group => {
                        const items = sidebarItems.filter(i => i.group === group.key);
                        if (items.length === 0) return null;

                        // Special rendering for products group — collapsible sub-categories
                        if (group.key === 'products') {
                            const PRODUCT_SUBS = [
                                { key: 'crm', label: 'CRM', icon: 'products' },
                                { key: 'app', label: 'APP', icon: 'app' },
                                { key: 'digital', label: 'Sản phẩm số', icon: 'digital' },
                            ];
                            // Auto-expand if current path is in a sub-group
                            const activeSubGroup = items.find(i => i.exact ? pathname === i.href : pathname.startsWith(i.href))?.subGroup;

                            return (
                                <div key={group.key}>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '16px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{group.label}</div>
                                    {PRODUCT_SUBS.map(sub => {
                                        const subItems = items.filter(i => (i as any).subGroup === sub.key);
                                        if (subItems.length === 0) return null;
                                        const isExpanded = expandedProductSubs[sub.key] || activeSubGroup === sub.key;
                                        const hasActiveChild = subItems.some(i => i.exact ? pathname === i.href : pathname.startsWith(i.href));

                                        return (
                                            <div key={sub.key}>
                                                {/* Sub-category header */}
                                                <button
                                                    onClick={() => setExpandedProductSubs(prev => ({ ...prev, [sub.key]: !prev[sub.key] }))}
                                                    className="crm-nav-item"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                        padding: '9px 14px', borderRadius: '12px',
                                                        background: hasActiveChild ? 'rgba(99,102,241,0.06)' : 'transparent',
                                                        color: hasActiveChild ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        fontWeight: 600, fontSize: '13px',
                                                        border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                                        borderLeft: '3px solid transparent',
                                                    }}
                                                >
                                                    <CrmIcon name={sub.icon} size={15} color={hasActiveChild ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                                    <span style={{ flex: 1 }}>{sub.label}</span>
                                                    <CrmIcon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} color="var(--text-muted)" />
                                                </button>
                                                {/* Sub-items */}
                                                {isExpanded && subItems.map(item => {
                                                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                                    const navLink = (
                                                        <Link key={item.href} href={item.href} className="crm-nav-item" style={{
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                            padding: '8px 14px 8px 38px', borderRadius: '10px',
                                                            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                                                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                            fontWeight: isActive ? 700 : 500, fontSize: '13px',
                                                            textDecoration: 'none',
                                                            borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                                        }}>
                                                            <CrmIcon name={item.icon} size={14} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                                            {item.label}
                                                        </Link>
                                                    );
                                                    return item.featureKey
                                                        ? <IfFeature key={item.href} feature={item.featureKey}>{navLink}</IfFeature>
                                                        : navLink;
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        }

                        // Standard group rendering
                        return (
                            <div key={group.key}>
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: group.key === 'workspace' ? '8px 14px 4px' : '16px 14px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{group.label}</div>
                                {items.map(item => {
                                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                    const navLink = (
                                        <Link key={item.href} href={item.href} className="crm-nav-item" style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '10px 14px', borderRadius: '12px',
                                            background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                                            color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                            fontWeight: isActive ? 700 : 500, fontSize: '14px',
                                            textDecoration: 'none',
                                            borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
                                        }}>
                                            <CrmIcon name={item.icon} size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                            {item.label}
                                        </Link>
                                    );
                                    return item.featureKey
                                        ? <IfFeature key={item.href} feature={item.featureKey}>{navLink}</IfFeature>
                                        : navLink;
                                })}
                            </div>
                        );
                    })}

                    <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                        {/* User profile */}
                        {authChecked && user && (
                            <div style={{ padding: '10px 14px', marginBottom: '6px', borderRadius: '12px', background: 'rgba(99,102,241,0.04)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        color: 'white', fontSize: '11px', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>{initials}</div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.phone}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {authChecked && !user && (
                            <Link href="/emk-crm/login" className="crm-nav-item" style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', borderRadius: '12px',
                                color: 'var(--accent-primary)', fontSize: '13px', fontWeight: 600,
                                textDecoration: 'none', marginBottom: '4px',
                            }}>
                                🔑 Đăng nhập
                            </Link>
                        )}
                        <Link href="/hub" className="crm-nav-item" style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 14px', borderRadius: '12px',
                            color: 'var(--text-muted)', fontSize: '13px', fontWeight: 500,
                            textDecoration: 'none',
                        }}>
                            <CrmIcon name="back" size={14} color="var(--text-muted)" /> Quay về Hub
                        </Link>
                        {authChecked && user && (
                            <button onClick={handleLogout} className="crm-nav-item" style={{
                                display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                padding: '10px 14px', borderRadius: '12px',
                                color: '#ef4444', fontSize: '13px', fontWeight: 500,
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                fontFamily: 'inherit', textAlign: 'left',
                            }}>
                                🚪 Đăng xuất
                            </button>
                        )}
                    </div>
                </aside>

                {/* Main area */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    {/* Mobile header */}
                    <header className="crm-mobile-header" style={{
                        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        background: 'var(--bg-glass)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                        borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50,
                    }}>
                        <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <CrmIcon name="ai" size={18} color="var(--accent-primary)" /> eMk-CRM
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {authChecked && !user && (
                                <Link href="/emk-crm/login" style={{ fontSize: '12px', color: 'white', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', borderRadius: '8px', background: 'var(--accent-primary)' }}>Đăng nhập</Link>
                            )}
                            {authChecked && user && (
                                <div style={{
                                    width: '30px', height: '30px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                    color: 'white', fontSize: '10px', fontWeight: 700,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }} title={user.name}>{initials}</div>
                            )}
                            <Link href="/hub" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 600, padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>← Hub</Link>
                            <button onClick={() => setMenuOpen(!menuOpen)} style={{
                                width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                borderRadius: '10px', background: menuOpen ? 'var(--accent-primary)' : 'var(--bg-card)',
                                border: '1px solid var(--border)', cursor: 'pointer',
                                transition: 'all 250ms cubic-bezier(.4,0,.2,1)',
                            }}>
                                <CrmIcon name={menuOpen ? 'close' : 'menu'} size={18} color={menuOpen ? 'white' : 'var(--text-secondary)'} />
                            </button>
                        </div>
                    </header>

                    {/* Mobile slide-down menu with animation */}
                    {menuVisible && (
                        <div className="crm-mobile-menu" style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 45,
                            background: menuOpen ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0)',
                            transition: 'background 300ms ease',
                        }} onClick={closeMenu}>
                            <div style={{
                                marginTop: '54px',
                                background: 'var(--bg-card)',
                                borderBottom: '1px solid var(--border)',
                                borderRadius: '0 0 20px 20px',
                                padding: '8px 10px 16px',
                                maxHeight: '75vh', overflowY: 'auto',
                                boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
                                transform: menuOpen ? 'translateY(0)' : 'translateY(-20px)',
                                opacity: menuOpen ? 1 : 0,
                                transition: 'all 300ms cubic-bezier(.4,0,.2,1)',
                            }} onClick={e => e.stopPropagation()}>
                                {/* Group: Quản lý */}
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Quản lý</div>
                                {sidebarItems.filter(i => i.group === 'manage').map((item, idx) => {
                                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                    return (
                                        <Link key={item.href} href={item.href} onClick={closeMenu}
                                            className="crm-menu-item"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 14px', borderRadius: '12px',
                                                background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontWeight: isActive ? 700 : 500, fontSize: '15px',
                                                textDecoration: 'none',
                                                transform: menuOpen ? 'translateX(0)' : 'translateX(-12px)',
                                                opacity: menuOpen ? 1 : 0,
                                                transition: `all 300ms cubic-bezier(.4,0,.2,1) ${idx * 30}ms`,
                                            }}>
                                            <span style={{
                                                width: '34px', height: '34px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-primary)',
                                                flexShrink: 0,
                                                transition: 'all 200ms ease',
                                            }}>
                                                <CrmIcon name={item.icon} size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                            </span>
                                            {item.label}
                                        </Link>
                                    );
                                })}

                                <div style={{ height: '1px', background: 'var(--border)', margin: '8px 12px' }} />

                                {/* Group: Vận hành */}
                                <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Vận hành</div>
                                {sidebarItems.filter(i => i.group === 'ops').map((item, idx) => {
                                    const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                    return (
                                        <Link key={item.href} href={item.href} onClick={closeMenu}
                                            className="crm-menu-item"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 14px', borderRadius: '12px',
                                                background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                fontWeight: isActive ? 700 : 500, fontSize: '15px',
                                                textDecoration: 'none',
                                                transform: menuOpen ? 'translateX(0)' : 'translateX(-12px)',
                                                opacity: menuOpen ? 1 : 0,
                                                transition: `all 300ms cubic-bezier(.4,0,.2,1) ${(idx + 4) * 30}ms`,
                                            }}>
                                            <span style={{
                                                width: '34px', height: '34px', borderRadius: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: isActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-primary)',
                                                flexShrink: 0,
                                                transition: 'all 200ms ease',
                                            }}>
                                                <CrmIcon name={item.icon} size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                            </span>
                                            {item.label}
                                        </Link>
                                    );
                                })}

                                {sidebarItems.some(i => i.group === 'apps') && (
                                    <>
                                        <div style={{ height: '1px', background: 'var(--border)', margin: '8px 12px' }} />
                                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', padding: '8px 12px 4px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Apps</div>
                                        {sidebarItems.filter(i => i.group === 'apps').map((item, idx) => {
                                            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                                            return (
                                                <Link key={item.href} href={item.href} onClick={closeMenu}
                                                    className="crm-menu-item"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '12px',
                                                        padding: '12px 14px', borderRadius: '12px',
                                                        background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                                                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                                        fontWeight: isActive ? 700 : 500, fontSize: '15px',
                                                        textDecoration: 'none',
                                                        transform: menuOpen ? 'translateX(0)' : 'translateX(-12px)',
                                                        opacity: menuOpen ? 1 : 0,
                                                        transition: `all 300ms cubic-bezier(.4,0,.2,1) ${(idx + 12) * 30}ms`,
                                                    }}>
                                                    <span style={{
                                                        width: '34px', height: '34px', borderRadius: '10px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: isActive ? 'rgba(99,102,241,0.12)' : 'var(--bg-primary)',
                                                        flexShrink: 0, transition: 'all 200ms ease',
                                                    }}>
                                                        <CrmIcon name={item.icon} size={16} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                                    </span>
                                                    {item.label}
                                                </Link>
                                            );
                                        })}
                                    </>
                                )}

                                <div style={{ height: '1px', background: 'var(--border)', margin: '8px 12px' }} />

                                {/* User info + Logout */}
                                {authChecked && user && (
                                    <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'rgba(99,102,241,0.04)', margin: '4px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                            <div style={{
                                                width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                                color: 'white', fontSize: '11px', fontWeight: 700,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>{initials}</div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.phone}</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <Link href="/hub" onClick={closeMenu} style={{
                                                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                                textDecoration: 'none', textAlign: 'center',
                                                background: 'var(--bg-primary)', color: 'var(--text-secondary)',
                                                border: '1px solid var(--border)',
                                            }}>← Về Hub</Link>
                                            <button onClick={() => { closeMenu(); handleLogout(); }} style={{
                                                flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                                background: '#ef444415', color: '#ef4444', border: '1px solid #ef444420',
                                                cursor: 'pointer', fontFamily: 'inherit',
                                            }}>Đăng xuất</button>
                                        </div>
                                    </div>
                                )}
                                {authChecked && !user && (
                                    <Link href="/emk-crm/login" onClick={closeMenu} style={{
                                        display: 'block', padding: '12px 14px', borderRadius: '12px', fontSize: '14px', fontWeight: 700,
                                        textDecoration: 'none', textAlign: 'center', margin: '4px 12px',
                                        background: 'var(--accent-primary)', color: 'white',
                                    }}>Đăng nhập</Link>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Content */}
                    <main style={{ flex: 1, padding: '20px 16px 100px', maxWidth: '960px', width: '100%', margin: '0 auto' }}>
                        <Breadcrumbs />
                        {children}
                    </main>

                    {/* Mobile bottom nav */}
                    <nav className="crm-mobile-nav" style={{
                        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
                        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
                        background: 'var(--bg-glass)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                        borderTop: '1px solid var(--border)', height: '68px',
                        paddingBottom: 'env(safe-area-inset-bottom)',
                    }}>
                        {mobileNav.map(item => {
                            const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);
                            return (
                                <Link key={item.href} href={item.href} className="crm-bnav-item" style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    gap: '2px', padding: '6px 14px', borderRadius: '14px',
                                    textDecoration: 'none', position: 'relative',
                                    color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                                    background: isActive ? 'rgba(99,102,241,0.08)' : 'transparent',
                                }}>
                                    <span style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        transition: 'transform 200ms cubic-bezier(.4,0,.2,1)',
                                        transform: isActive ? 'scale(1.1)' : 'scale(1)',
                                    }}>
                                        <CrmIcon name={item.icon} size={21} color={isActive ? 'var(--accent-primary)' : 'var(--text-muted)'} />
                                    </span>
                                    <span style={{ fontSize: '10px', fontWeight: isActive ? 700 : 500, transition: 'all 200ms ease' }}>{item.label}</span>
                                    {/* Active dot indicator */}
                                    {isActive && <span style={{
                                        position: 'absolute', bottom: '2px', left: '50%', transform: 'translateX(-50%)',
                                        width: '4px', height: '4px', borderRadius: '50%',
                                        background: 'var(--accent-primary)',
                                        animation: 'crm-dot-in 300ms ease forwards',
                                    }} />}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                <AiChatWidget layer="crm" currentPage={pathname} />
                {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
                    <DemoCTA productKey="CRM_SPA_PRO" productName="CRM Spa Pro" />
                )}

                {/* Scoped CSS: responsive + animations */}
                <style>{`
                @media (max-width: 768px) {
                    .crm-sidebar { display: none !important; }
                }
                @media (min-width: 769px) {
                    .crm-mobile-header { display: none !important; }
                    .crm-mobile-nav { display: none !important; }
                    .crm-mobile-menu { display: none !important; }
                }

                /* Desktop sidebar hover */
                .crm-nav-item {
                    transition: all 200ms cubic-bezier(.4,0,.2,1) !important;
                }
                .crm-nav-item:hover {
                    background: rgba(99,102,241,0.06) !important;
                    transform: translateX(3px);
                }

                /* Mobile menu item hover/active */
                .crm-menu-item {
                    transition: all 200ms cubic-bezier(.4,0,.2,1) !important;
                }
                .crm-menu-item:active {
                    transform: scale(0.97) !important;
                    opacity: 0.85 !important;
                }

                /* Bottom nav items */
                .crm-bnav-item {
                    transition: all 200ms cubic-bezier(.4,0,.2,1) !important;
                }
                .crm-bnav-item:active {
                    transform: scale(0.9);
                }

                /* Dot appear animation */
                @keyframes crm-dot-in {
                    from { transform: translateX(-50%) scale(0); opacity: 0; }
                    to { transform: translateX(-50%) scale(1); opacity: 1; }
                }
            `}</style>
            </div>
        </EntitlementProvider>
    );
}
