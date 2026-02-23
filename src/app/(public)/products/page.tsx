import Link from 'next/link';

export default function ProductsPage() {
    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1>Sản phẩm CRM theo ngành</h1>
                <p>Chọn CRM phù hợp với ngành của bạn. Mỗi CRM được thiết kế riêng cho lĩnh vực cụ thể.</p>
            </div>

            <div className="grid grid-3">
                {/* Spa CRM - Available */}
                <div className="card" style={{ borderColor: 'var(--accent-primary)', position: 'relative' }}>
                    <div style={{
                        position: 'absolute', top: '-12px', right: '16px',
                        background: 'var(--accent-gradient)', padding: '4px 12px',
                        borderRadius: '20px', fontSize: '12px', fontWeight: 600, color: 'white',
                    }}>
                        🟢 Sẵn sàng
                    </div>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>💆</div>
                    <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Spa CRM</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px', lineHeight: 1.6 }}>
                        CRM toàn diện cho Spa & Salon. Quản lý khách hàng, lịch hẹn, dịch vụ, phiếu thu,
                        nhân viên và doanh thu – tất cả trong một.
                    </p>
                    <ul style={{ listStyle: 'none', marginBottom: '24px' }}>
                        {['Quản lý Khách hàng', 'Lịch hẹn & Đặt lịch online', 'Dịch vụ & Menu', 'Phiếu thu & Công nợ', 'Module mở rộng'].map((f) => (
                            <li key={f} style={{ padding: '4px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                                ✓ {f}
                            </li>
                        ))}
                    </ul>
                    <Link href="/signup" className="btn btn-primary" style={{ width: '100%' }}>
                        Dùng thử miễn phí
                    </Link>
                </div>

                {/* Future CRMs - Coming Soon */}
                {[
                    { icon: '🏥', name: 'Clinic CRM', desc: 'CRM cho phòng khám, nha khoa, thẩm mỹ viện.' },
                    { icon: '🏋️', name: 'Gym CRM', desc: 'CRM cho phòng tập gym, yoga, pilates, fitness center.' },
                ].map((product) => (
                    <div key={product.name} className="card" style={{ opacity: 0.6 }}>
                        <div style={{
                            position: 'absolute', top: '16px', right: '16px',
                            fontSize: '11px', color: 'var(--text-muted)',
                        }}>
                            Coming Soon
                        </div>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>{product.icon}</div>
                        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{product.name}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.6 }}>
                            {product.desc}
                        </p>
                        <button className="btn btn-secondary" style={{ width: '100%', marginTop: '24px' }} disabled>
                            Sắp ra mắt
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
