import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/hub/seed-products – Seed 3 demo products (CRM, APP, DIGITAL)
// Only works if no products exist yet (safe to re-run)
export async function POST() {
    const existing = await db.product.count();
    if (existing > 0) {
        return NextResponse.json({ message: `Đã có ${existing} sản phẩm. Bỏ qua seed.`, seeded: 0 });
    }

    const products = [
        {
            key: 'CRM_SPA_PRO', slug: 'crm-spa-pro', name: 'CRM Spa Pro',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'PROVISION_TENANT',
            status: 'PUBLISHED', isActive: true,
            icon: '💆', tagline: 'Quản lý spa chuyên nghiệp, đặt lịch thông minh',
            description: 'Hệ thống CRM toàn diện cho spa & salon: quản lý khách hàng, đặt lịch, theo dõi dịch vụ, báo cáo doanh thu, loyalty program. Hỗ trợ multi-chi nhánh.',
            outcomeText: 'Tăng 30% lượng khách quay lại nhờ chăm sóc tự động',
            industry: ['SPA', 'SALON'],
            priceOriginal: 990000, priceRental: 490000, priceSale: 0, priceMonthly: 490000,
            sortOrder: 1,
            features: JSON.stringify([
                { text: 'Quản lý khách hàng không giới hạn', included: true },
                { text: 'Đặt lịch online', included: true },
                { text: 'Báo cáo doanh thu', included: true },
                { text: 'Loyalty & điểm thưởng', included: true },
                { text: 'Nhắc hẹn tự động (SMS/Zalo)', included: true },
                { text: 'Multi-chi nhánh', included: false },
            ]),
            faq: JSON.stringify([
                { q: 'Có dùng thử không?', a: 'Có! 14 ngày dùng thử miễn phí, không cần thẻ.' },
                { q: 'Hỗ trợ bao nhiêu nhân viên?', a: 'Gói Pro hỗ trợ tối đa 20 nhân viên.' },
            ]),
        },
        {
            key: 'APP_AI_CONTENT', slug: 'app-ai-content', name: 'AI Content Creator',
            type: 'APP', billingModel: 'PAYG', deliveryMethod: 'ENABLE_APP',
            status: 'PUBLISHED', isActive: true,
            icon: '🤖', tagline: 'Tạo nội dung marketing bằng AI, nhanh gấp 10 lần',
            description: 'Ứng dụng tạo nội dung tự động: bài viết Facebook, caption Instagram, email marketing, mô tả sản phẩm. Hỗ trợ tiếng Việt chuẩn SEO.',
            outcomeText: 'Tiết kiệm 5 giờ/tuần cho việc viết content',
            industry: ['SALES', 'PERSONAL'],
            priceOriginal: 0, priceRental: 0, priceSale: 0, priceMonthly: 0,
            sortOrder: 2,
            features: JSON.stringify([
                { text: 'Tạo caption Facebook/Instagram', included: true },
                { text: 'Viết email marketing', included: true },
                { text: 'Mô tả sản phẩm SEO', included: true },
                { text: 'Script video TikTok', included: true },
                { text: 'Hỗ trợ tiếng Việt chuẩn', included: true },
            ]),
            faq: JSON.stringify([
                { q: 'Tính phí như thế nào?', a: 'Trả theo lượt: 2,000đ/bài ngắn, 5,000đ/bài dài. Nạp ví trước.' },
                { q: 'Chất lượng AI?', a: 'Sử dụng GPT-4o, tối ưu hóa cho thị trường Việt Nam.' },
            ]),
        },
        {
            key: 'DIG_MARKETING_GUIDE', slug: 'digital-marketing-guide', name: 'Tài liệu Digital Marketing A-Z',
            type: 'DIGITAL', billingModel: 'ONE_TIME', deliveryMethod: 'DOWNLOAD_GRANT',
            status: 'PUBLISHED', isActive: true,
            icon: '📚', tagline: 'Học digital marketing từ A-Z, thực chiến ngay',
            description: 'Bộ tài liệu 200+ trang: Facebook Ads, Google Ads, SEO, Email Marketing, Content Strategy. Kèm template + case study thực tế Việt Nam.',
            outcomeText: 'Nắm vững kiến thức digital marketing trong 30 ngày',
            industry: ['SALES', 'PERSONAL'],
            priceOriginal: 990000, priceRental: 0, priceSale: 499000, priceMonthly: 0,
            sortOrder: 3,
            features: JSON.stringify([
                { text: '200+ trang tài liệu chuyên sâu', included: true },
                { text: '50+ template sẵn dùng', included: true },
                { text: '10 case study Việt Nam', included: true },
                { text: 'Video hướng dẫn 5 giờ', included: true },
                { text: 'Cập nhật miễn phí 1 năm', included: true },
            ]),
            faq: JSON.stringify([
                { q: 'Nhận tài liệu bằng cách nào?', a: 'Sau thanh toán, tải ngay trong phần "Tải xuống" trên Hub.' },
                { q: 'Có hoàn tiền không?', a: 'Hoàn tiền 100% trong 7 ngày nếu không hài lòng.' },
            ]),
        },
    ];

    const created = [];
    for (const p of products) {
        const product = await db.product.create({ data: p as never });
        created.push({ id: product.id, name: product.name, type: product.type });
    }

    // Create metered items for AI Content Creator (PAYG)
    const aiProduct = created.find(p => p.type === 'APP');
    if (aiProduct) {
        await db.meteredItem.createMany({
            data: [
                { productId: aiProduct.id, key: 'SHORT_POST', unitName: 'Bài ngắn', unitPrice: 2000, isActive: true },
                { productId: aiProduct.id, key: 'LONG_POST', unitName: 'Bài dài', unitPrice: 5000, isActive: true },
                { productId: aiProduct.id, key: 'EMAIL', unitName: 'Email', unitPrice: 3000, isActive: true },
            ],
        });
    }

    return NextResponse.json({ ok: true, seeded: created.length, products: created }, { status: 201 });
}
