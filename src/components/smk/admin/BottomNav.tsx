'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
    href: string;
    icon: string;
    label: string;
}

const MAIN_ITEMS: NavItem[] = [
    { href: '/smk-crm', icon: '📊', label: 'Tổng quan' },
    { href: '/smk-crm/products', icon: '📦', label: 'Sản phẩm' },
    { href: '/smk-crm/orders', icon: '🛒', label: 'Đơn hàng' },
    { href: '/smk-crm/customers', icon: '👥', label: 'Khách hàng' },
];

const MORE_ITEMS: NavItem[] = [
    { href: '/smk-crm/warehouse', icon: '🏭', label: 'Kho hàng' },
    { href: '/smk-crm/returns', icon: '↩️', label: 'Đổi trả' },
    { href: '/smk-crm/support', icon: '🎧', label: 'Hỗ trợ' },
    { href: '/smk-crm/reviews', icon: '⭐', label: 'Đánh giá' },
    { href: '/smk-crm/partners', icon: '🤝', label: 'Đối tác' },
    { href: '/smk-crm/commissions', icon: '💰', label: 'Hoa hồng' },
    { href: '/smk-crm/payouts', icon: '💸', label: 'Rút tiền' },
    { href: '/smk-crm/automation', icon: '⚡', label: 'Tự động' },
    { href: '/smk-crm/ai', icon: '🤖', label: 'AI & KB' },
    { href: '/smk-crm/analytics', icon: '📈', label: 'Phân tích' },
    { href: '/smk-crm/seo', icon: '🔍', label: 'SEO' },
    { href: '/smk-crm/fraud', icon: '🛡️', label: 'Chống gian lận' },
    { href: '/smk-crm/audit', icon: '📋', label: 'Nhật ký' },
    { href: '/smk-crm/users', icon: '👤', label: 'Users' },
    { href: '/smk-crm/prescription', icon: '👁️', label: 'Đơn kính' },
    { href: '/smk-crm/shipping', icon: '🚚', label: 'Vận chuyển' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === '/smk-crm') return pathname === '/smk-crm';
        return pathname.startsWith(href);
    };

    const isMoreActive = MORE_ITEMS.some(item => isActive(item.href));

    return (
        <>
            {/* More drawer overlay */}
            {moreOpen && (
                <div className="admin-bottomnav-overlay" onClick={() => setMoreOpen(false)} />
            )}

            {/* More drawer */}
            <div className={`admin-bottomnav-drawer ${moreOpen ? 'admin-bottomnav-drawer--open' : ''}`}>
                <div className="admin-bottomnav-drawer__handle" onClick={() => setMoreOpen(false)}>
                    <div className="admin-drawer__handle-bar" />
                </div>
                <div className="admin-bottomnav-drawer__title">Tất cả trang</div>
                <div className="admin-bottomnav-drawer__grid">
                    {MORE_ITEMS.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`admin-bottomnav-drawer__item ${isActive(item.href) ? 'admin-bottomnav-drawer__item--active' : ''}`}
                            onClick={() => setMoreOpen(false)}
                        >
                            <span className="admin-bottomnav-drawer__item-icon">{item.icon}</span>
                            <span className="admin-bottomnav-drawer__item-label">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Bottom nav bar */}
            <nav className="admin-bottomnav">
                {MAIN_ITEMS.map(item => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`admin-bottomnav__item ${isActive(item.href) ? 'admin-bottomnav__item--active' : ''}`}
                    >
                        <span className="admin-bottomnav__icon">{item.icon}</span>
                        <span className="admin-bottomnav__label">{item.label}</span>
                    </Link>
                ))}
                <button
                    className={`admin-bottomnav__item ${isMoreActive || moreOpen ? 'admin-bottomnav__item--active' : ''}`}
                    onClick={() => setMoreOpen(!moreOpen)}
                >
                    <span className="admin-bottomnav__icon">•••</span>
                    <span className="admin-bottomnav__label">Thêm</span>
                </button>
            </nav>
        </>
    );
}
