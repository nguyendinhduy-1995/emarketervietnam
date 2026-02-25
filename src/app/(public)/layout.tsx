'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AnalyticsTracker from '@/components/AnalyticsTracker';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuthPage = pathname === '/login' || pathname === '/signup';

    return (
        <>
            <AnalyticsTracker layer="landing" />
            {!isAuthPage && (
                <nav className="navbar">
                    <Link href="/" className="navbar-brand">⚡ eMarketer Hub</Link>
                    <ul className="navbar-links">
                        <li className="nav-hide-mobile"><Link href="/products">Sản phẩm</Link></li>
                        <li className="nav-hide-mobile"><Link href="/pricing">Bảng giá</Link></li>
                        <li><Link href="/login">Đăng nhập</Link></li>
                        <li><Link href="/signup" className="btn btn-primary btn-sm">Dùng thử</Link></li>
                    </ul>
                </nav>
            )}
            {children}
        </>
    );
}
