const { PrismaClient } = require('../node_modules/.prisma/platform');
const db = new PrismaClient();

const posts = [
    { title: 'Chào mừng đến eMarketer Hub', slug: 'welcome-emarketerhub', excerpt: 'eMarketer Hub là nền tảng SaaS tập hợp tất cả giải pháp marketing và quản lý doanh nghiệp cho bạn.', body: 'eMarketer Hub ra đời với sứ mệnh giúp các doanh nghiệp vừa và nhỏ tại Việt Nam tiếp cận các công cụ marketing chuyên nghiệp.', category: 'Tin tức', status: 'PUBLISHED' },
    { title: 'Hướng dẫn cài đặt Workspace đầu tiên', slug: 'setup-first-workspace', excerpt: 'Chỉ 30 giây để tạo workspace và bắt đầu quản lý khách hàng.', body: 'Bước 1: Đăng nhập. Bước 2: Chọn ngành nghề. Bước 3: Đặt tên workspace. Done!', category: 'Hướng dẫn', status: 'PUBLISHED' },
    { title: 'Ra mắt tính năng CRM Pro', slug: 'crm-pro-launch', excerpt: 'CRM Pro với pipeline tùy chỉnh, AI lead scoring và báo cáo nâng cao.', body: 'Tính năng CRM Pro bao gồm: Pipeline drag-and-drop, AI phân tích lead tự động, dashboard realtime, và tích hợp Zalo/Facebook.', category: 'Cập nhật', status: 'PUBLISHED' },
    { title: 'Giảm 30% gói Starter cho khách hàng mới', slug: 'promo-starter-30', excerpt: 'Ưu đãi đặc biệt: Giảm 30% gói Starter khi đăng ký trong tháng này.', body: 'Chương trình khuyến mãi áp dụng cho khách hàng mới đăng ký gói Starter trong tháng 2/2026.', category: 'Khuyến mãi', status: 'PUBLISHED' },
    { title: 'Cách tối ưu quy trình chăm sóc khách hàng', slug: 'optimize-customer-care', excerpt: 'Bí quyết giữ chân khách hàng và tăng tỷ lệ retention lên 40%.', body: '1. Phản hồi nhanh. 2. Follow-up đúng lịch. 3. Cá nhân hóa. 4. Thu thập feedback.', category: 'Hướng dẫn', status: 'PUBLISHED' },
    { title: 'Tích hợp Zalo OA với CRM', slug: 'zalo-oa-integration', excerpt: 'Kết nối Zalo Official Account để nhắn tin tự động từ CRM.', body: 'Vào Cài đặt > Kết nối > Zalo OA > Đăng nhập và cấp quyền. Sau đó có thể nhắn tin tự động.', category: 'Hướng dẫn', status: 'PUBLISHED' },
    { title: 'Cập nhật phiên bản v2.5', slug: 'update-v25', excerpt: 'Dashboard mới, hiệu suất cải thiện 2x, và nhiều tính năng mới.', body: 'Phiên bản 2.5: Dashboard redesigned, tốc độ nhanh 2x, biểu đồ realtime, export PDF.', category: 'Cập nhật', status: 'PUBLISHED' },
    { title: 'Mua 1 năm tặng 2 tháng', slug: 'promo-yearly-bonus', excerpt: 'Đăng ký gói năm được tặng thêm 2 tháng miễn phí.', body: 'Áp dụng cho tất cả các gói: Starter, Pro. Liên hệ để biết thêm chi tiết.', category: 'Khuyến mãi', status: 'PUBLISHED' },
    { title: '5 sai lầm khi quản lý Spa bằng Excel', slug: 'spa-excel-mistakes', excerpt: 'Excel không phải giải pháp lâu dài. Đây là 5 lý do bạn cần CRM.', body: '1. Mất dữ liệu. 2. Không realtime. 3. Không nhắc lịch. 4. Khó chia sẻ. 5. Không phân tích được.', category: 'Tin tức', status: 'PUBLISHED' },
    { title: 'Automation: Tự động hóa quy trình bán hàng', slug: 'automation-sales', excerpt: 'Giảm 70% thời gian thủ công với automation trong eMarketer.', body: 'Automation: Gửi tin chào mừng, nhắc lịch, follow-up lead, chuyển trạng thái tự động.', category: 'Hướng dẫn', status: 'PUBLISHED' }
];

async function seed() {
    for (const p of posts) {
        const existing = await db.cmsPost.findUnique({ where: { slug: p.slug } });
        if (!existing) {
            await db.cmsPost.create({ data: { ...p, authorId: 'system' } });
            console.log('  ✓ ' + p.title);
        } else {
            console.log('  - (exists) ' + p.title);
        }
    }
    console.log('Done!');
    await db.$disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
