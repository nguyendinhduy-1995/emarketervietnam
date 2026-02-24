import Link from "next/link";

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'var(--bg-glass)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontWeight: 800, fontSize: '18px', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="var(--accent-primary)" /></svg>
          eMarketer
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/gioi-thieu" className="landing-nav-link" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Giới thiệu</Link>
          <Link href="/giai-phap" className="landing-nav-link" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>Sản phẩm</Link>
          <Link href="/hub" style={{
            padding: '8px 16px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
            background: 'var(--accent-primary)', color: 'white', textDecoration: 'none',
          }}>Đăng nhập</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ padding: '48px 20px 32px', textAlign: 'center', maxWidth: '640px', margin: '0 auto' }}>
        <h1 className="landing-hero-title" style={{
          fontSize: 'clamp(26px, 7vw, 48px)', fontWeight: 900, lineHeight: 1.2, marginBottom: '16px', letterSpacing: '-0.5px'
        }}>
          Quản lý doanh nghiệp{' '}
          <span style={{ background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            thông minh hơn
          </span>
        </h1>
        <p style={{ fontSize: 'clamp(15px, 4vw, 20px)', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '28px' }}>
          Nền tảng CRM & Hub đa ngành – từ Spa, Salon đến Bán hàng. Tạo workspace và bắt đầu quản lý chỉ trong 30 giây.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', maxWidth: '300px', margin: '0 auto' }}>
          <Link href="/lp/spa" style={{
            width: '100%', padding: '16px', borderRadius: '16px', fontWeight: 700, fontSize: '16px',
            color: 'white', textAlign: 'center', textDecoration: 'none', display: 'block',
            background: 'var(--accent-primary)', boxShadow: '0 4px 20px rgba(99,102,241,0.3)',
          }}>Dùng thử miễn phí →</Link>
          <Link href="/giai-phap" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Xem tất cả sản phẩm
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '32px 16px', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, textAlign: 'center', marginBottom: '24px' }}>Tại sao chọn eMarketer?</h2>
        <div className="landing-grid-2" style={{ display: 'grid', gap: '12px' }}>
          {[
            { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>, title: 'Bắt đầu trong 30 giây', desc: 'Đăng ký → Chọn ngành → Có ngay CRM với dữ liệu demo.' },
            { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2" /><line x1="12" y1="18" x2="12.01" y2="18" /></svg>, title: 'Mobile-first PWA', desc: 'Dùng như app trên điện thoại, hoạt động cả offline.' },
            { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>, title: 'An toàn & Riêng tư', desc: 'Dữ liệu cách ly hoàn toàn, mã hóa AES-256.' },
            { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>, title: 'Giao diện tinh tế', desc: 'Dark/Light mode tự động. Thiết kế tối giản trên mọi thiết bị.' },
          ].map((f, i) => (
            <div key={i} style={{
              padding: '20px', borderRadius: '16px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ marginBottom: '10px' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>{f.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Industry CTAs */}
      <section style={{ padding: '32px 16px', maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ fontSize: 'clamp(20px, 5vw, 28px)', fontWeight: 800, marginBottom: '20px' }}>Sản phẩm theo ngành</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
          {[
            { href: '/lp/spa', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>, label: 'Spa & Salon' },
            { href: '/lp/ban-hang', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>, label: 'Bán hàng' },
            { href: '/lp/ca-nhan', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>, label: 'Cá nhân' },
          ].map((item) => (
            <Link key={item.href} href={item.href} style={{
              padding: '12px 20px', borderRadius: '14px', fontSize: '14px', fontWeight: 600,
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
            }}>{item.icon} {item.label}</Link>
          ))}
        </div>
      </section>

      {/* Social Proof */}
      <section style={{ padding: '24px 16px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '8px' }}>
          {['Tăng 45% hiệu suất', 'Giảm 60% thời gian', 'Multi-tenant bảo mật'].map((p, i) => (
            <div key={i} style={{
              padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--accent-primary)',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline', marginRight: '4px', verticalAlign: '-1px' }}><polyline points="20 6 9 17 4 12" /></svg>
              {p}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
        © {new Date().getFullYear()} eMarketer Vietnam. Powered by AI.
      </footer>

      {/* Mobile responsive styles */}
      <style>{`
        .landing-grid-2 { grid-template-columns: repeat(2, 1fr); }
        @media (max-width: 560px) {
          .landing-grid-2 { grid-template-columns: 1fr; }
        }
        @media (max-width: 390px) {
          .landing-nav-link { display: none; }
        }
      `}</style>
    </div>
  );
}
