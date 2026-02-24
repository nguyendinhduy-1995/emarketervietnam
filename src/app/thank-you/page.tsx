'use client';
import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ThankYouContent() {
    const params = useSearchParams();
    const token = params.get('token');

    useEffect(() => {
        if (token) {
            const timer = setTimeout(() => {
                window.location.href = `/api/auth/token-login?token=${token}`;
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [token]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
            <div className="text-center max-w-md">
                <div className="text-6xl mb-6">🎉</div>
                <h1 className="text-3xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Đăng ký thành công!
                </h1>
                <p className="text-lg mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    Hệ thống đang chuẩn bị workspace của bạn.
                    {token && ' Tự động chuyển hướng trong 3 giây...'}
                </p>
                {token && (
                    <a href={`/api/auth/token-login?token=${token}`}
                        className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-all"
                        style={{ background: 'var(--accent-primary)' }}>
                        Vào Hub ngay →
                    </a>
                )}
                {!token && (
                    <a href="/login"
                        className="inline-block px-6 py-3 rounded-xl font-semibold text-white transition-all"
                        style={{ background: 'var(--accent-primary)' }}>
                        Đăng nhập →
                    </a>
                )}
            </div>
        </div>
    );
}

export default function ThankYouPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}><div className="text-2xl">⏳</div></div>}>
            <ThankYouContent />
        </Suspense>
    );
}
