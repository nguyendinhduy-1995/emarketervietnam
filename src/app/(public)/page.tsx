import Link from 'next/link';

export default function HomePage() {
    return (
        <>
            {/* Hero */}
            <section className="hero">
                <h1 style={{ animationDelay: '0.1s' }} className="animate-in">
                    Tạo CRM Spa<br />
                    <span>trong 30 giây</span>
                </h1>
                <p className="animate-in" style={{ animationDelay: '0.3s' }}>
                    Nền tảng quản lý Spa & Salon thông minh. Quản lý khách hàng, lịch hẹn,
                    doanh thu – tất cả trên một nền tảng.
                </p>
                <div className="animate-in" style={{ animationDelay: '0.5s', display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <Link href="/signup" className="btn btn-primary btn-lg">
                        🚀 Bắt đầu miễn phí
                    </Link>
                    <Link href="/products" className="btn btn-secondary btn-lg">
                        Tìm hiểu thêm →
                    </Link>
                </div>
            </section>

            {/* Features */}
            <section className="container" style={{ padding: '60px 20px' }}>
                <div className="grid grid-3">
                    {[
                        { icon: '👥', title: 'Quản lý Khách hàng', desc: 'Lưu trữ thông tin, lịch sử dịch vụ và phân loại khách hàng tự động.' },
                        { icon: '📅', title: 'Lịch hẹn thông minh', desc: 'Đặt lịch, nhắc hẹn tự động, chống trùng ca và quản lý lịch trực quan.' },
                        { icon: '💆', title: 'Dịch vụ & Nhân viên', desc: 'Quản lý menu dịch vụ, phân ca nhân viên, tính hoa hồng tự động.' },
                        { icon: '🧾', title: 'Phiếu thu & Doanh thu', desc: 'Tạo phiếu thu nhanh, theo dõi công nợ, báo cáo doanh thu real-time.' },
                        { icon: '📦', title: 'Marketplace Module', desc: 'Mở rộng CRM với Inbox, Automation, Booking, Analytics và AI Suite.' },
                        { icon: '🔐', title: 'Bảo mật & Multi-tenant', desc: 'Mỗi Spa có không gian riêng, dữ liệu cách ly hoàn toàn, mã hóa AI key.' },
                    ].map((f, i) => (
                        <div key={i} className="card animate-in" style={{ animationDelay: `${0.1 * i}s` }}>
                            <div style={{ fontSize: '40px', marginBottom: '16px' }}>{f.icon}</div>
                            <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>{f.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: 'linear-gradient(180deg, transparent, rgba(99, 102, 241, 0.05))',
            }}>
                <h2 style={{ fontSize: '36px', fontWeight: 700, marginBottom: '16px' }}>
                    Sẵn sàng <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>chuyển đổi số</span>?
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '18px' }}>
                    Miễn phí mãi mãi cho Core CRM. Nâng cấp bất cứ lúc nào.
                </p>
                <Link href="/signup" className="btn btn-primary btn-lg">
                    Tạo CRM ngay – Miễn phí ✨
                </Link>
            </section>

            {/* Footer */}
            <footer style={{
                padding: '32px 40px',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'var(--text-muted)',
                fontSize: '13px',
            }}>
                <span>© 2026 eMarketer Vietnam. All rights reserved.</span>
                <span>Built with ❤️ for Vietnamese Spas</span>
            </footer>
        </>
    );
}
