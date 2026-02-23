'use client';
import Link from 'next/link';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <nav className="navbar">
                <Link href="/" className="navbar-brand">⚡ eMarketer Hub</Link>
                <ul className="navbar-links">
                    <li><Link href="/products">Sản phẩm</Link></li>
                    <li><Link href="/pricing">Bảng giá</Link></li>
                    <li><Link href="/login">Đăng nhập</Link></li>
                    <li><Link href="/signup" className="btn btn-primary btn-sm">Dùng thử miễn phí</Link></li>
                </ul>
            </nav>
            {children}
        </>
    );
}
