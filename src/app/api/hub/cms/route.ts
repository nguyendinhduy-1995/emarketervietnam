import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

// GET /api/hub/cms — public articles for Hub display
export async function GET() {
    try {
        // Return published CMS posts for Hub overview
        // Try database first, fallback to defaults
        let posts: Array<{ id: string; title: string; excerpt: string; body: string; category: string; createdAt: string; slug: string }> = [];

        try {
            const dbPosts = await platformDb.cmsPost.findMany({
                where: { status: 'PUBLISHED' },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });
            posts = dbPosts.map(p => ({
                id: p.id,
                title: p.title,
                excerpt: p.excerpt || '',
                body: p.body || '',
                category: p.category,
                createdAt: p.createdAt.toISOString(),
                slug: p.slug,
            }));
        } catch {
            // CmsPost table may not exist yet, return defaults
            posts = [
                {
                    id: 'default-1',
                    title: 'Chào mừng đến eMarketer Hub',
                    excerpt: 'eMarketer Hub là nền tảng tập hợp tất cả giải pháp, ứng dụng và công cụ marketing cho doanh nghiệp của bạn.',
                    body: 'eMarketer Hub giúp bạn quản lý toàn bộ hoạt động kinh doanh từ một nơi duy nhất. Tạo workspace, mời nhân viên và bắt đầu sử dụng ngay.',
                    category: 'Tin tức',
                    createdAt: new Date().toISOString(),
                    slug: 'welcome',
                },
                {
                    id: 'default-2',
                    title: 'Cách nạp tiền vào ví eMarketer',
                    excerpt: 'Hướng dẫn nạp tiền qua QR Banking, chuyển khoản nhanh 24/7 và xác nhận tự động.',
                    body: 'Bước 1: Vào mục Ví → Nạp tiền. Bước 2: Chọn số tiền cần nạp. Bước 3: Chuyển khoản theo mã QR được tạo. Bước 4: Hệ thống xác nhận tự động trong vòng 1-5 phút.',
                    category: 'Hướng dẫn',
                    createdAt: new Date().toISOString(),
                    slug: 'topup-guide',
                },
                {
                    id: 'default-3',
                    title: 'Ra mắt tính năng CRM mới',
                    excerpt: 'Quản lý khách hàng, lead và pipeline bán hàng hiệu quả hơn với CRM tích hợp.',
                    body: 'CRM mới tích hợp quản lý leads, tài khoản khách hàng, công việc và phân tích dữ liệu. Bắt đầu sử dụng ngay từ Hub.',
                    category: 'Cập nhật',
                    createdAt: new Date().toISOString(),
                    slug: 'crm-launch',
                },
            ];
        }

        return NextResponse.json({ posts });
    } catch {
        return NextResponse.json({ posts: [] });
    }
}
