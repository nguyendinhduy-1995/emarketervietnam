import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Giải pháp – eMarketer Vietnam',
    description: 'Các giải pháp CRM theo ngành: Spa, Salon, Bán hàng, Cá nhân.',
};

const solutions = [
    { icon: '💆', title: 'Spa & Thẩm mỹ', desc: 'CRM lịch hẹn, POS, hoa hồng, tích điểm chuyên biệt.', href: '/lp/spa' },
    { icon: '💼', title: 'Bán hàng đa kênh', desc: 'Pipeline, leads, đơn hàng – mọi kênh trên 1 màn hình.', href: '/lp/ban-hang' },
    { icon: '👤', title: 'Hub Cá nhân', desc: 'Quản lý công việc, ghi chú và bảo mật dữ liệu.', href: '/lp/ca-nhan' },
    { icon: '🏥', title: 'Phòng khám', desc: 'Hệ thống quản lý bệnh nhân, lịch khám (sắp ra mắt).', href: '#' },
];

export default function GiaiPhapPage() {
    return (
        <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
            <nav className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-glass)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
                <Link href="/" className="font-bold text-lg" style={{ color: 'var(--accent-primary)' }}>eMarketer</Link>
                <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg" style={{ color: 'var(--text-secondary)' }}>Đăng nhập</Link>
            </nav>

            <section className="px-4 py-16 max-w-4xl mx-auto">
                <h1 className="text-3xl font-extrabold mb-2">Giải pháp theo ngành</h1>
                <p className="text-lg mb-10" style={{ color: 'var(--text-secondary)' }}>Chọn giải pháp phù hợp với mô hình kinh doanh của bạn.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {solutions.map((s, i) => (
                        <Link key={i} href={s.href}
                            className="p-6 rounded-2xl transition-all hover:translate-y-[-2px] block"
                            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                            <span className="text-4xl mb-3 block">{s.icon}</span>
                            <h3 className="font-bold text-xl mb-2" style={{ color: 'var(--text-primary)' }}>{s.title}</h3>
                            <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{s.desc}</p>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
