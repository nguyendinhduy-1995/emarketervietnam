import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'eMarketer – Nền tảng phần mềm quản lý ngành dịch vụ',
    description: 'CRM, POS, đặt lịch online, tích điểm – tất cả trên một nền tảng cloud. Dùng thử miễn phí.',
};

export default function GioiThieuPage() {
    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <nav className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <Link href="/" className="font-bold text-lg" style={{ color: 'var(--accent-primary)' }}>eMarketer</Link>
                <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>Đăng nhập</Link>
            </nav>

            <section className="px-4 py-16 max-w-3xl mx-auto">
                <h1 className="text-3xl font-extrabold mb-6">Về eMarketer Vietnam</h1>
                <div className="space-y-6 text-lg" style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <p>eMarketer Vietnam phát triển nền tảng SaaS multi-tenant giúp doanh nghiệp ngành dịch vụ (Spa, Salon, Clinic…) chuyển đổi số toàn diện.</p>
                    <p>Với kiến trúc cloud-native, mỗi doanh nghiệp sở hữu workspace riêng, bảo mật dữ liệu theo chuẩn AES-256 và tự động mở rộng quy mô.</p>
                    <div className="p-6 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <h3 className="font-bold text-xl mb-4" style={{ color: 'var(--text-primary)' }}>Tại sao chọn chúng tôi?</h3>
                        <ul className="space-y-3">
                            <li>✅ Multi-tenant isolation – dữ liệu tách biệt hoàn toàn</li>
                            <li>✅ PWA – cài trực tiếp trên điện thoại, dùng offline</li>
                            <li>✅ AI tích hợp – trợ lý ảo tư vấn kinh doanh</li>
                            <li>✅ Miễn phí dùng thử 30 ngày</li>
                        </ul>
                    </div>
                </div>
                <div className="mt-10">
                    <Link href="/lp/spa" className="inline-block px-8 py-4 rounded-2xl font-semibold text-white text-lg"
                        style={{ background: 'var(--accent-primary)' }}>
                        Dùng thử miễn phí →
                    </Link>
                </div>
            </section>
        </div>
    );
}
