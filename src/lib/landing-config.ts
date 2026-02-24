// Landing page configuration-driven template system
// Create new landing pages by adding config objects - no copy/paste needed

export interface LandingConfig {
    slug: string;
    heroTitle: string;
    heroSubtitle: string;
    heroCtaLabel: string;
    features: { icon: string; title: string; desc: string }[];
    proofTitle?: string;
    proofItems?: string[];
    formTitle: string;
    formIndustryDefault?: string;
    ogTitle: string;
    ogDescription: string;
}

export const LANDING_CONFIGS: Record<string, LandingConfig> = {
    'spa': {
        slug: 'spa',
        heroTitle: 'Quản lý Spa & Salon 4.0',
        heroSubtitle: 'Tối ưu từng ca làm, theo dõi doanh thu real-time, tích điểm khách hàng – tất cả trên một nền tảng cloud duy nhất.',
        heroCtaLabel: 'Dùng thử miễn phí',
        features: [
            { icon: '📅', title: 'Lịch hẹn thông minh', desc: 'Khách tự đặt lịch online, nhân viên nhận thông báo tự động.' },
            { icon: '💰', title: 'POS & Hoa hồng', desc: 'Tạo phiếu thu nhanh, tự động tính hoa hồng cho nhân viên.' },
            { icon: '🎁', title: 'Voucher & Tích điểm', desc: 'Hệ thống loyalty tăng tỉ lệ quay lại đến 60%.' },
            { icon: '📊', title: 'Báo cáo chi tiết', desc: 'Dashboard real-time doanh thu, chuyển đổi, hiệu suất nhân viên.' },
        ],
        proofTitle: 'Được tin dùng bởi 100+ Spa',
        proofItems: ['Tăng 45% hiệu suất quản lý', 'Giảm 60% thời gian nhập liệu', 'ROI trung bình 3 tháng'],
        formTitle: 'Bắt đầu với Spa CRM',
        formIndustryDefault: 'SPA',
        ogTitle: 'eMarketer cho Spa & Salon – CRM 4.0',
        ogDescription: 'Phần mềm quản lý Spa thông minh, từ lịch hẹn đến doanh thu.',
    },
    'ban-hang': {
        slug: 'ban-hang',
        heroTitle: 'CRM Bán hàng đa kênh',
        heroSubtitle: 'Quản lý leads, pipeline, và đơn hàng trên một giao diện duy nhất. Tối ưu chuyển đổi tuần tự.',
        heroCtaLabel: 'Nhận tài khoản miễn phí',
        features: [
            { icon: '🎯', title: 'Pipeline trực quan', desc: 'Kéo thả deal qua từng giai đoạn bán hàng.' },
            { icon: '📱', title: 'Đa kênh', desc: 'Tích hợp Facebook, Zalo, Website vào một inbox.' },
            { icon: '📈', title: 'Dự báo doanh số', desc: 'AI phân tích xu hướng và dự đoán doanh thu.' },
            { icon: '🤝', title: 'Team collaboration', desc: 'Phân quyền, giao việc, theo dõi KPI nhóm.' },
        ],
        formTitle: 'Trải nghiệm CRM Bán hàng',
        formIndustryDefault: 'SALES',
        ogTitle: 'eMarketer CRM Bán hàng – Tăng doanh thu 40%',
        ogDescription: 'Pipeline bán hàng đa kênh, quản lý leads và đơn hàng thông minh.',
    },
    'ca-nhan': {
        slug: 'ca-nhan',
        heroTitle: 'Hub Cá Nhân – Quản lý công việc',
        heroSubtitle: 'Tổ chức dự án, theo dõi thói quen, và bảo mật dữ liệu cá nhân trên cloud riêng của bạn.',
        heroCtaLabel: 'Tạo Hub miễn phí',
        features: [
            { icon: '✅', title: 'Task Manager', desc: 'Kanban board cá nhân, ưu tiên công việc thông minh.' },
            { icon: '📓', title: 'Ghi chú nhanh', desc: 'Markdown editor với sync real-time.' },
            { icon: '🔒', title: 'Bảo mật', desc: 'Mã hoá AES-256, dữ liệu chỉ thuộc về bạn.' },
            { icon: '📱', title: 'PWA', desc: 'Cài app trên điện thoại, dùng offline.' },
        ],
        formTitle: 'Bắt đầu Hub cá nhân',
        formIndustryDefault: 'PERSONAL',
        ogTitle: 'eMarketer Hub Cá nhân – Quản lý cuộc sống',
        ogDescription: 'Tổ chức công việc, bảo mật dữ liệu cá nhân trên nền tảng cloud.',
    },
};

export function getLandingConfig(slug: string): LandingConfig | undefined {
    return LANDING_CONFIGS[slug];
}
