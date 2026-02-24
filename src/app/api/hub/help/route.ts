import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

// Default help docs if DB is empty
const DEFAULT_DOCS = [
    {
        id: 'help-1', productKey: 'HUB', moduleKey: 'getting-started', title: 'Bắt đầu sử dụng eMarketer Hub',
        slug: 'getting-started', sortOrder: 0,
        contentMd: `## Chào mừng đến eMarketer Hub!\n\neMarketer Hub là nền tảng trung tâm giúp bạn quản lý toàn bộ hoạt động kinh doanh.\n\n### Bước 1: Tạo Workspace\nSau khi đăng nhập, hệ thống sẽ tạo workspace cho bạn. Workspace là không gian làm việc riêng cho doanh nghiệp.\n\n### Bước 2: Khám phá sản phẩm\nTruy cập **Sản phẩm** để xem các sản phẩm phù hợp với ngành của bạn.\n\n### Bước 3: Nạp tiền ví\nVào **Ví** → **Nạp tiền** để nạp tiền qua QR Banking nhanh chóng.`,
    },
    {
        id: 'help-2', productKey: 'HUB', moduleKey: 'wallet', title: 'Hướng dẫn sử dụng Ví',
        slug: 'wallet-guide', sortOrder: 1,
        contentMd: `## Ví eMarketer\n\n### Nạp tiền\n1. Vào mục **Ví** → chọn **Nạp tiền**\n2. Chọn số tiền cần nạp (100k, 200k, 500k, 1M)\n3. Quét mã QR hoặc chuyển khoản theo nội dung\n4. Hệ thống xác nhận tự động trong 1-5 phút\n\n### Xem lịch sử giao dịch\nTất cả giao dịch nạp/chi tiêu đều hiển thị trong phần **Lịch sử** của Ví.\n\n### Lưu ý\n- Số tiền nạp tối thiểu: **100,000 VND**\n- Nội dung chuyển khoản phải đúng để xác nhận tự động`,
    },
    {
        id: 'help-3', productKey: 'HUB', moduleKey: 'marketplace', title: 'Sản phẩm & Marketplace',
        slug: 'marketplace-guide', sortOrder: 2,
        contentMd: `## Marketplace\n\nMarketplace là nơi bạn khám phá và kích hoạt các sản phẩm cho doanh nghiệp.\n\n### Các sản phẩm hiện có\n- **SPA CRM** — Quản lý khách hàng, đặt lịch cho Spa\n- **Sales Hub** — Pipeline bán hàng, quản lý lead\n- **Personal CRM** — CRM cá nhân cho freelancer\n\n### Cách kích hoạt\n1. Chọn sản phẩm phù hợp\n2. Xem chi tiết và so sánh gói\n3. Nhấn **Dùng thử** hoặc **Mua ngay**\n4. Sản phẩm sẽ xuất hiện ngay trong workspace`,
    },
    {
        id: 'help-4', productKey: 'HUB', moduleKey: 'account', title: 'Quản lý tài khoản',
        slug: 'account-settings', sortOrder: 3,
        contentMd: `## Cài đặt tài khoản\n\n### Đổi mật khẩu\n1. Vào **Tài khoản** → **Cài đặt**\n2. Nhập mật khẩu cũ và mật khẩu mới\n3. Nhấn **Lưu**\n\n### Cập nhật thông tin\n- Đổi tên hiển thị\n- Thêm/sửa email\n- Quản lý thông báo\n\n### Bảo mật\n- Sử dụng mật khẩu mạnh (ít nhất 8 ký tự)\n- Không chia sẻ thông tin đăng nhập`,
    },
    {
        id: 'help-5', productKey: 'HUB', moduleKey: 'faq', title: 'Câu hỏi thường gặp (FAQ)',
        slug: 'faq', sortOrder: 4,
        contentMd: `## FAQ\n\n### Tôi quên mật khẩu?\nNhấn **"Quên mật khẩu"** trên trang đăng nhập. Chúng tôi sẽ gửi link reset qua email/SMS.\n\n### Nạp tiền bao lâu thì nhận?\nThông thường 1-5 phút. Nếu quá 15 phút, vui lòng liên hệ hỗ trợ.\n\n### Tôi có thể huỷ gói?\nCó, bạn có thể huỷ bất cứ lúc nào. Số dư ví vẫn được giữ nguyên.\n\n### Làm sao liên hệ hỗ trợ?\nNhắn tin qua **AI Trợ lý** (nút ⚡ góc phải) hoặc gọi hotline.`,
    },
];

// GET /api/hub/help — list help docs
export async function GET(req: Request) {
    const url = new URL(req.url);
    const search = url.searchParams.get('q')?.toLowerCase() || '';
    const module = url.searchParams.get('module') || '';

    try {
        let docs = await platformDb.helpDoc.findMany({
            orderBy: { sortOrder: 'asc' },
        });

        // Fallback to defaults if empty
        if (docs.length === 0) {
            // Use defaults — cast to match shape
            const defaults = DEFAULT_DOCS.map(d => ({
                ...d,
                version: 1,
                updatedAt: new Date(),
                createdAt: new Date(),
            }));

            // Apply filters on defaults
            let filtered = defaults;
            if (search) {
                filtered = filtered.filter(d =>
                    d.title.toLowerCase().includes(search) ||
                    d.contentMd.toLowerCase().includes(search)
                );
            }
            if (module) {
                filtered = filtered.filter(d => d.moduleKey === module);
            }
            return NextResponse.json({ docs: filtered });
        }

        // Apply filters
        if (search) {
            docs = docs.filter(d =>
                d.title.toLowerCase().includes(search) ||
                d.contentMd.toLowerCase().includes(search)
            );
        }
        if (module) {
            docs = docs.filter(d => d.moduleKey === module);
        }

        return NextResponse.json({ docs });
    } catch {
        // Table may not exist, return defaults
        let filtered = DEFAULT_DOCS;
        if (search) {
            filtered = filtered.filter(d =>
                d.title.toLowerCase().includes(search) ||
                d.contentMd.toLowerCase().includes(search)
            );
        }
        return NextResponse.json({ docs: filtered });
    }
}
