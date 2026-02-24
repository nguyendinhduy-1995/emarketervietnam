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
    { href: '/admin', icon: '📊', label: 'Tổng quan' },
    { href: '/admin/products', icon: '📦', label: 'Sản phẩm' },
    { href: '/admin/orders', icon: '🛒', label: 'Đơn hàng' },
    { href: '/admin/customers', icon: '👥', label: 'Khách hàng' },
];

const MORE_ITEMS: NavItem[] = [
    { href: '/admin/warehouse', icon: '🏭', label: 'Kho hàng' },
    { href: '/admin/returns', icon: '↩️', label: 'Đổi trả' },
    { href: '/admin/support', icon: '🎧', label: 'Hỗ trợ' },
    { href: '/admin/reviews', icon: '⭐', label: 'Đánh giá' },
    { href: '/admin/partners', icon: '🤝', label: 'Đối tác' },
    { href: '/admin/commissions', icon: '💰', label: 'Hoa hồng' },
    { href: '/admin/payouts', icon: '💸', label: 'Rút tiền' },
    { href: '/admin/automation', icon: '⚡', label: 'Tự động' },
    { href: '/admin/ai', icon: '🤖', label: 'AI & KB' },
    { href: '/admin/analytics', icon: '📈', label: 'Phân tích' },
    { href: '/admin/seo', icon: '🔍', label: 'SEO' },
    { href: '/admin/fraud', icon: '🛡️', label: 'Chống gian lận' },
    { href: '/admin/audit', icon: '📋', label: 'Nhật ký' },
    { href: '/admin/users', icon: '👤', label: 'Users' },
    { href: '/admin/prescription', icon: '👁️', label: 'Đơn kính' },
    { href: '/admin/shipping', icon: '🚚', label: 'Vận chuyển' },
];

export default function BottomNav() {
    const pathname = usePathname();
    const [moreOpen, setMoreOpen] = useState(false);

    const isActive = (href: string) => {
        if (href === '/admin') return pathname === '/admin';
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
