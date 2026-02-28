'use client';
import Link from 'next/link';
import { ArrowLeft, Shirt } from 'lucide-react';
import { FeatureGate } from '@/components/FeatureGate';

export default function FashionPage() {
    return (
        <FeatureGate feature="ESTUDIO_FASHION">
            <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <Link href="/" className="p-2 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-pink-400 to-fuchsia-400 bg-clip-text text-transparent flex items-center gap-2">
                            <Shirt className="w-6 h-6 text-pink-500" /> Fashion AI
                        </h1>
                        <p className="text-xs text-gray-500">Thiết kế thời trang bằng AI</p>
                    </div>
                </div>
                <div className="p-12 rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 text-center">
                    <div className="text-5xl mb-4">🚧</div>
                    <h2 className="text-xl font-bold mb-2">Đang phát triển</h2>
                    <p className="text-gray-400 text-sm">Module Fashion AI sẽ được cập nhật trong phiên bản tiếp theo.</p>
                </div>
            </div>
        </FeatureGate>
    );
}
