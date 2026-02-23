'use client';
import { useParams } from 'next/navigation';

export default function PayrollDashboardPage() {
    const { spaSlug } = useParams();

    return (
        <div>
            <div className="page-header">
                <h1>💰 Dashboard Lương & Hoa hồng</h1>
                <p>Tổng quan tình hình chi trả lương và hoa hồng cho nhân viên</p>
            </div>

            <div className="grid grid-3" style={{ marginBottom: '32px' }}>
                <div className="stat-card">
                    <div className="stat-label">Bảng lương nháp tháng này</div>
                    <div className="stat-value">0</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Tổng hoa hồng tạm tính</div>
                    <div className="stat-value">0 đ</div>
                </div>
                <div className="stat-card">
                    <div className="stat-label">Rules hoa hồng đang Active</div>
                    <div className="stat-value">-</div>
                </div>
            </div>

            <div className="card">
                <h3>📌 Hướng dẫn sử dụng</h3>
                <ol style={{ marginLeft: '20px', marginTop: '12px', lineHeight: 1.8, color: 'var(--text-secondary)' }}>
                    <li>Vào mục <strong>Cấu hình Hoa hồng</strong> để thiết lập % hoặc số tiền hoa hồng cho từng dịch vụ/nhân viên.</li>
                    <li>Hoa hồng sẽ tự động được ghi nhận mỗi khi có Phiếu thu (Receipt) mới được tạo.</li>
                    <li>Cuối tháng, vào mục <strong>Bảng lương</strong> để xem, tự động tính tổng lương và duyệt chi.</li>
                </ol>
            </div>
        </div>
    );
}
