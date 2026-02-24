import Link from 'next/link';

export default function PricingPage() {
    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1>Bảng giá minh bạch</h1>
                <p>Miễn phí mãi mãi cho CRM cơ bản. Mở rộng với sản phẩm khi bạn sẵn sàng.</p>
            </div>

            <div className="grid grid-3" style={{ maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
                {/* FREE */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Miễn phí</h3>
                    <div className="price">0₫<span className="price-period">/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        CRM cơ bản – đủ để bắt đầu
                    </p>
                    <ul>
                        <li>Quản lý Khách hàng (không giới hạn)</li>
                        <li>Lịch hẹn cơ bản</li>
                        <li>Menu Dịch vụ</li>
                        <li>Phiếu thu cơ bản</li>
                        <li>1 Không gian làm việc</li>
                    </ul>
                    <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
                        Bắt đầu miễn phí
                    </Link>
                </div>

                {/* STARTER */}
                <div className="pricing-card featured">
                    <div style={{
                        background: 'var(--accent-gradient)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        display: 'inline-block',
                        marginBottom: '12px',
                    }}>
                        ⭐ PHỔ BIẾN NHẤT
                    </div>
                    <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Khởi đầu</h3>
                    <div className="price">199K₫<span className="price-period">/sản phẩm/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        Chọn sản phẩm bạn cần
                    </p>
                    <ul>
                        <li>Tất cả tính năng gói Miễn phí</li>
                        <li>Chọn sản phẩm: Hộp thư, Tự động hoá, Đặt lịch...</li>
                        <li>Hỗ trợ ưu tiên</li>
                        <li>Báo cáo nâng cao</li>
                        <li>Đa người dùng (3 người)</li>
                    </ul>
                    <Link href="/signup" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                        Dùng thử 14 ngày
                    </Link>
                </div>

                {/* PRO */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Chuyên nghiệp</h3>
                    <div className="price">699K₫<span className="price-period">/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        Tất cả sản phẩm + AI
                    </p>
                    <ul>
                        <li>Tất cả tính năng gói Khởi đầu</li>
                        <li>Tất cả sản phẩm đã mở</li>
                        <li>Bộ AI (dùng khoá riêng)</li>
                        <li>Truy cập API</li>
                        <li>Không giới hạn người dùng</li>
                        <li>Hỗ trợ 24/7</li>
                    </ul>
                    <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
                        Liên hệ
                    </Link>
                </div>
            </div>

            {/* Module pricing */}
            <div style={{ maxWidth: '800px', margin: '60px auto 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>Giá từng sản phẩm</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Sản phẩm</th>
                                <th>Giá/tháng</th>
                                <th>Mô tả</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { icon: '💬', name: 'Hộp thư', price: '199K₫', desc: 'Tin nhắn đa kênh' },
                                { icon: '⚡', name: 'Tự động hoá', price: '299K₫', desc: 'Nhắc lịch, theo dõi tự động' },
                                { icon: '🎫', name: 'Thẻ thành viên', price: '149K₫', desc: 'Thẻ thành viên, tích điểm' },
                                { icon: '📦', name: 'Kho hàng', price: '199K₫', desc: 'Quản lý tồn kho' },
                                { icon: '💰', name: 'Hoa hồng', price: '149K₫', desc: 'Hoa hồng nhân viên' },
                                { icon: '📅', name: 'Đặt lịch trực tuyến', price: '249K₫', desc: 'Đặt lịch trực tuyến' },
                                { icon: '📊', name: 'Phân tích', price: '299K₫', desc: 'Báo cáo chi tiết' },
                                { icon: '🤖', name: 'Bộ trợ lý AI', price: '499K₫', desc: 'Trợ lý AI, phân tích ảnh' },
                            ].map((m) => (
                                <tr key={m.name}>
                                    <td><span style={{ marginRight: '8px' }}>{m.icon}</span>{m.name}</td>
                                    <td style={{ fontWeight: 600, color: 'var(--accent-secondary)' }}>{m.price}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{m.desc}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
