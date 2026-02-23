import Link from 'next/link';

export default function PricingPage() {
    return (
        <div className="container" style={{ padding: '60px 20px' }}>
            <div className="page-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
                <h1>Bảng giá minh bạch</h1>
                <p>Miễn phí mãi mãi cho Core CRM. Mở rộng với Module khi bạn sẵn sàng.</p>
            </div>

            <div className="grid grid-3" style={{ maxWidth: '1000px', margin: '0 auto', alignItems: 'start' }}>
                {/* FREE */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Free</h3>
                    <div className="price">0₫<span className="price-period">/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        Core CRM – đủ để bắt đầu
                    </p>
                    <ul>
                        <li>Quản lý Khách hàng (không giới hạn)</li>
                        <li>Lịch hẹn cơ bản</li>
                        <li>Menu Dịch vụ</li>
                        <li>Phiếu thu cơ bản</li>
                        <li>1 Workspace</li>
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
                    <h3 style={{ fontSize: '20px', fontWeight: 600 }}>Starter</h3>
                    <div className="price">199K₫<span className="price-period">/module/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        Chọn module bạn cần
                    </p>
                    <ul>
                        <li>Tất cả tính năng Free</li>
                        <li>Chọn module: Inbox, Automation, Booking...</li>
                        <li>Hỗ trợ ưu tiên</li>
                        <li>Báo cáo nâng cao</li>
                        <li>Multi-user (3 người)</li>
                    </ul>
                    <Link href="/signup" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>
                        Dùng thử 14 ngày
                    </Link>
                </div>

                {/* PRO */}
                <div className="pricing-card">
                    <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pro</h3>
                    <div className="price">699K₫<span className="price-period">/tháng</span></div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
                        Tất cả module + AI
                    </p>
                    <ul>
                        <li>Tất cả tính năng Starter</li>
                        <li>Tất cả module đã mở</li>
                        <li>AI Suite (BYOK)</li>
                        <li>API Access</li>
                        <li>Không giới hạn user</li>
                        <li>Hỗ trợ 24/7</li>
                    </ul>
                    <Link href="/signup" className="btn btn-secondary" style={{ width: '100%', marginTop: '16px' }}>
                        Liên hệ
                    </Link>
                </div>
            </div>

            {/* Module pricing */}
            <div style={{ maxWidth: '800px', margin: '60px auto 0', textAlign: 'center' }}>
                <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '32px' }}>Giá từng Module</h2>
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Module</th>
                                <th>Giá/tháng</th>
                                <th>Mô tả</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { icon: '💬', name: 'Inbox', price: '199K₫', desc: 'Tin nhắn đa kênh' },
                                { icon: '⚡', name: 'Automation', price: '299K₫', desc: 'Nhắc lịch, follow-up tự động' },
                                { icon: '🎫', name: 'Membership', price: '149K₫', desc: 'Thẻ thành viên, tích điểm' },
                                { icon: '📦', name: 'Inventory', price: '199K₫', desc: 'Quản lý tồn kho' },
                                { icon: '💰', name: 'Commission', price: '149K₫', desc: 'Hoa hồng nhân viên' },
                                { icon: '📅', name: 'Online Booking', price: '249K₫', desc: 'Đặt lịch online' },
                                { icon: '📊', name: 'Analytics', price: '299K₫', desc: 'Báo cáo chi tiết' },
                                { icon: '🤖', name: 'AI Suite', price: '499K₫', desc: 'Trợ lý AI, phân tích ảnh' },
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
