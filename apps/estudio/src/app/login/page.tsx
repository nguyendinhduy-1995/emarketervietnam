'use client';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LoginPage() {
    const hubUrl = process.env.NEXT_PUBLIC_HUB_URL || 'https://hub.emarketervietnam.vn';
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md text-center">
                <div className="text-6xl mb-6">🎬</div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
                    eStudio
                </h1>
                <p className="text-gray-400 text-sm mb-8">AI Content Studio</p>

                <div className="p-8 rounded-2xl bg-gray-900 border border-gray-800">
                    <h2 className="text-lg font-bold mb-4">Đăng nhập qua Hub</h2>
                    <p className="text-sm text-gray-400 mb-6">
                        eStudio được quản lý bởi eMarketer Hub. Đăng nhập qua Hub để sử dụng.
                    </p>
                    <a href={hubUrl}
                        className="block w-full p-4 rounded-xl font-bold text-center bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity">
                        🔑 Đăng nhập qua eMarketer Hub
                    </a>
                </div>

                <Link href="/" className="flex items-center justify-center gap-1 mt-6 text-sm text-gray-500 hover:text-gray-300">
                    <ArrowLeft className="w-4 h-4" /> Quay về trang chủ
                </Link>
            </div>
        </div>
    );
}
