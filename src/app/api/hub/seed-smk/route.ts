import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/hub/seed-smk — Seed Sieuthimatkinh CRM + add-on products onto Hub marketplace
export async function POST() {
    try {
        // Check if SMK products already exist
        const existing = await db.product.count({ where: { key: { startsWith: 'SMK_' } } });
        if (existing > 0) {
            return NextResponse.json({ message: `Đã có ${existing} sản phẩm SMK. Bỏ qua seed.`, seeded: 0 });
        }

        // Shared fields for all SMK products
        const shared = {
            status: 'PUBLISHED' as const,
            isActive: true,
            industry: ['OPTICAL', 'RETAIL'],
        };

        // ─── Main CRM Product ──────────────────────────────
        const mainProduct = {
            ...shared,
            key: 'SMK_CRM_CORE',
            slug: 'smk-crm-matkinh',
            name: 'Siêu Thị Mắt Kính CRM',
            tagline: 'Quản lý cửa hàng mắt kính chuyên nghiệp',
            type: 'CRM',
            billingModel: 'SUBSCRIPTION',
            deliveryMethod: 'PROVISION_TENANT',
            icon: '👓',
            priceMonthly: 690000,
            priceOriginal: 1290000,
            priceSale: 690000,
            priceRental: 690000,
            description: 'Hệ thống CRM toàn diện cho cửa hàng mắt kính: quản lý sản phẩm (gọng, tròng, phụ kiện), đơn hàng, khách hàng, báo cáo doanh thu. Hỗ trợ multi-chi nhánh.',
            outcomeText: 'Quản lý sản phẩm, đơn hàng, khách hàng cho cửa hàng mắt kính. Bao gồm POS, kho hàng cơ bản, phân tích.',
            features: [
                { text: 'Quản lý sản phẩm kính (gọng, tròng, phụ kiện)', included: true },
                { text: 'Đơn hàng + thanh toán đa kênh (COD, VNPay, MoMo)', included: true },
                { text: 'Quản lý khách hàng & lịch sử mua', included: true },
                { text: 'Dashboard phân tích doanh thu', included: true },
                { text: 'Mã giảm giá / coupon', included: true },
                { text: 'PWA - hoạt động offline', included: true },
                { text: 'Nhiều nhân viên, phân quyền', included: true },
                { text: 'SEO cơ bản (sitemap, meta tags)', included: true },
            ],
            faq: [
                { q: 'Có dùng thử miễn phí không?', a: 'Có! 14 ngày dùng thử đầy đủ tính năng, không cần thẻ.' },
                { q: 'Hỗ trợ bao nhiêu nhân viên?', a: 'Gói Core hỗ trợ tối đa 5 nhân viên. Nâng cấp để thêm.' },
                { q: 'Dữ liệu có an toàn không?', a: 'Dữ liệu được mã hoá, backup tự động hàng ngày.' },
            ],
            sortOrder: 10,
        };

        // ─── Add-on Products ───────────────────────────────

        const addons = [
            { key: 'SMK_ADV_SHIPPING', slug: 'smk-addon-shipping', name: 'Multi-carrier Shipping', icon: '🚚', tagline: 'GHN, GHTK, ViettelPost, J&T, NinjaVan', billingModel: 'SUBSCRIPTION', priceMonthly: 290000, priceSale: 290000, priceRental: 290000, description: 'Tích hợp đa nhà vận chuyển, tracking tự động, webhook realtime.', outcomeText: 'Giảm 70% thời gian xử lý vận chuyển', features: [{ text: 'GHN, GHTK, ViettelPost, J&T, NinjaVan', included: true }, { text: 'Tracking realtime', included: true }, { text: 'Webhook auto-update', included: true }], sortOrder: 20 },
            { key: 'SMK_ADV_WAREHOUSE', slug: 'smk-addon-warehouse', name: 'Kho hàng & Kiểm kê', icon: '🏭', tagline: 'Multi-warehouse, stocktake, ledger', billingModel: 'SUBSCRIPTION', priceMonthly: 290000, priceSale: 290000, priceRental: 290000, description: 'Quản lý nhiều kho, phiếu nhập/xuất/điều chỉnh, kiểm kê tồn kho.', outcomeText: 'Tồn kho sai lệch < 0.5%', features: [{ text: 'Multi-warehouse', included: true }, { text: 'Phiếu nhập/xuất/điều chỉnh', included: true }, { text: 'Kiểm kê stocktake', included: true }], sortOrder: 21 },
            { key: 'SMK_ADV_PARTNER', slug: 'smk-addon-partner', name: 'Affiliate / Đối tác Portal', icon: '🤝', tagline: 'Partner portal, commission, payouts', billingModel: 'SUBSCRIPTION', priceMonthly: 490000, priceSale: 490000, priceRental: 490000, description: 'Portal đối tác riêng, hoa hồng tự động, chi trả, phát hiện gian lận.', outcomeText: 'Mở rộng kênh bán hàng qua đối tác', features: [{ text: 'Portal đối tác', included: true }, { text: 'Commission rules', included: true }, { text: 'Wallet & payouts', included: true }, { text: 'Fraud detection', included: true }], sortOrder: 22 },
            { key: 'SMK_ADV_RETURNS', slug: 'smk-addon-returns', name: 'Đổi trả / Bảo hành', icon: '🔄', tagline: 'RMA, warranty, exchange flow', billingModel: 'SUBSCRIPTION', priceMonthly: 190000, priceSale: 190000, priceRental: 190000, description: 'Quản lý đổi trả, bảo hành, trao đổi sản phẩm có quy trình duyệt.', outcomeText: 'Xử lý bảo hành nhanh gấp 3 lần', features: [{ text: 'Đổi trả / bảo hành / trao đổi', included: true }, { text: 'Upload ảnh/video bằng chứng', included: true }, { text: 'Admin approval flow', included: true }], sortOrder: 23 },
            { key: 'SMK_ADV_REVIEWS', slug: 'smk-addon-reviews', name: 'Đánh giá & Q&A', icon: '⭐', tagline: 'Reviews, Q&A, spam detection', billingModel: 'SUBSCRIPTION', priceMonthly: 190000, priceSale: 190000, priceRental: 190000, description: 'Hệ thống đánh giá sản phẩm, Q&A, phát hiện spam, verified reviews.', outcomeText: 'Tăng 25% chuyển đổi nhờ social proof', features: [{ text: 'Rating + media reviews', included: true }, { text: 'Q&A section', included: true }, { text: 'Spam detection', included: true }], sortOrder: 24 },
            { key: 'SMK_ADV_AI', slug: 'smk-addon-ai', name: 'AI Content Creator', icon: '🤖', tagline: 'AI content generation cho sản phẩm kính', billingModel: 'PAYG', type: 'APP', priceMonthly: 0, priceSale: 0, priceRental: 0, description: 'Tạo mô tả sản phẩm bằng AI cho website, Facebook, TikTok, Zalo. 4 tone.', outcomeText: 'Viết mô tả nhanh x10 (30 phút → 3 phút)', features: [{ text: 'Multi-platform content', included: true }, { text: '4 tone of voice', included: true }, { text: 'One-click apply', included: true }], sortOrder: 25 },
            { key: 'SMK_ADV_ANALYTICS', slug: 'smk-addon-analytics', name: 'Advanced Analytics', icon: '📊', tagline: 'Revenue, cohorts, funnels', billingModel: 'SUBSCRIPTION', priceMonthly: 390000, priceSale: 390000, priceRental: 390000, description: 'Phân tích nâng cao: doanh thu, cohort khách hàng, funnel chuyển đổi.', outcomeText: 'Phát hiện xu hướng trước 2 tuần', features: [{ text: 'Revenue analytics', included: true }, { text: 'Customer cohorts', included: true }, { text: 'Conversion funnels', included: true }], sortOrder: 26 },
            { key: 'SMK_ADV_AUTOMATION', slug: 'smk-addon-automation', name: 'Marketing Automation', icon: '⚡', tagline: 'Triggers, scheduled tasks, abandoned cart', billingModel: 'SUBSCRIPTION', priceMonthly: 390000, priceSale: 390000, priceRental: 390000, description: 'Tự động hóa marketing: email/SMS triggers, nhắc giỏ hàng bỏ quên.', outcomeText: 'Thu hồi 15-20% giỏ hàng bỏ quên', features: [{ text: 'Email/SMS triggers', included: true }, { text: 'Abandoned cart recovery', included: true }, { text: 'Scheduled campaigns', included: true }], sortOrder: 27 },
            { key: 'SMK_ADV_TRYON', slug: 'smk-addon-tryon', name: 'Virtual Try-on (AR)', icon: '👁️', tagline: 'Thử kính ảo bằng camera AR', billingModel: 'SUBSCRIPTION', priceMonthly: 490000, priceSale: 490000, priceRental: 490000, industry: ['OPTICAL'], description: 'Khách hàng thử kính ảo bằng camera. Face detection + overlay kính.', outcomeText: 'Tăng 40% conversion trên mobile', features: [{ text: 'AR face detection', included: true }, { text: 'Realtime overlay', included: true }, { text: 'Mobile-first', included: true }], sortOrder: 28 },
            { key: 'SMK_ADV_LOYALTY', slug: 'smk-addon-loyalty', name: 'Loyalty & Points', icon: '🎁', tagline: 'Tích điểm, đổi thưởng, membership', billingModel: 'SUBSCRIPTION', priceMonthly: 290000, priceSale: 290000, priceRental: 290000, description: 'Chương trình loyalty: tích điểm khi mua, đổi thưởng, hạng thành viên.', outcomeText: 'Tăng 30% khách quay lại', features: [{ text: 'Tích điểm tự động', included: true }, { text: 'Đổi thưởng / voucher', included: true }, { text: 'Membership tiers', included: true }], sortOrder: 29 },
            { key: 'SMK_ADV_PRESCRIPTION', slug: 'smk-addon-prescription', name: 'Đơn thuốc mắt', icon: '📋', tagline: 'SPH/CYL/AXIS/PD, upload ảnh đơn', billingModel: 'SUBSCRIPTION', priceMonthly: 190000, priceSale: 190000, priceRental: 190000, industry: ['OPTICAL'], description: 'Quản lý đơn thuốc mắt: nhập SPH/CYL/AXIS/PD, upload ảnh đơn.', outcomeText: 'Giảm 90% sai sót đơn thuốc', features: [{ text: 'Form đơn thuốc chuẩn', included: true }, { text: 'Upload ảnh đơn', included: true }, { text: 'Gắn vào đơn hàng', included: true }], sortOrder: 30 },
            { key: 'SMK_ADV_SEO', slug: 'smk-addon-seo', name: 'SEO Tools Pro', icon: '🔍', tagline: 'Meta editor, structured data, audit', billingModel: 'ONE_TIME', priceMonthly: 0, priceSale: 990000, priceOriginal: 1490000, priceRental: 0, description: 'Công cụ SEO nâng cao: meta editor, structured data, audit report.', outcomeText: 'Tăng 50% traffic organic trong 3 tháng', features: [{ text: 'Meta editor nâng cao', included: true }, { text: 'Structured data auto', included: true }, { text: 'SEO audit report', included: true }], sortOrder: 31 },
            { key: 'SMK_ADV_SUPPORT', slug: 'smk-addon-support', name: 'Customer Support', icon: '🎧', tagline: 'Ticket system, live chat, FAQ', billingModel: 'SUBSCRIPTION', priceMonthly: 290000, priceSale: 290000, priceRental: 290000, description: 'Hệ thống hỗ trợ khách hàng: ticket, live chat, quản lý FAQ.', outcomeText: 'Phản hồi nhanh < 30 phút', features: [{ text: 'Ticket system', included: true }, { text: 'Live chat widget', included: true }, { text: 'FAQ management', included: true }], sortOrder: 32 },
            { key: 'SMK_ADV_SHOP_EXTRAS', slug: 'smk-addon-shop-extras', name: 'Shop Extras', icon: '🛍️', tagline: 'Wishlist, Compare, Quiz, Blog, Booking', billingModel: 'SUBSCRIPTION', priceMonthly: 190000, priceSale: 190000, priceRental: 190000, description: 'Tính năng shop mở rộng: wishlist, so sánh, quiz tìm kính, blog, booking.', outcomeText: 'Tăng thời gian trên site 45%', features: [{ text: 'Wishlist', included: true }, { text: 'So sánh sản phẩm', included: true }, { text: 'Quiz tìm kính', included: true }, { text: 'Blog', included: true }, { text: 'Đặt lịch hẹn', included: true }], sortOrder: 33 },
        ];

        const allProducts = [mainProduct, ...addons.map(a => ({
            ...shared,
            type: 'CRM',
            deliveryMethod: 'ENTITLEMENT_FLAG',
            priceOriginal: 0,
            faq: [] as { q: string; a: string }[],
            ...a,
        }))];

        const created = [];

        for (const p of allProducts) {
            const product = await db.product.create({ data: p as never });
            created.push({ id: product.id, key: p.key, name: product.name });
        }

        // Create metered items for AI Content (PAYG)
        const aiProduct = created.find(p => p.key === 'SMK_ADV_AI');
        if (aiProduct) {
            await db.meteredItem.createMany({
                data: [
                    { productId: aiProduct.id, key: 'AI_PRODUCT_DESC', unitName: 'Mô tả sản phẩm', unitPrice: 3000, isActive: true },
                    { productId: aiProduct.id, key: 'AI_SOCIAL_POST', unitName: 'Bài social media', unitPrice: 2000, isActive: true },
                    { productId: aiProduct.id, key: 'AI_SEO_META', unitName: 'SEO meta content', unitPrice: 1500, isActive: true },
                ],
            });
        }

        return NextResponse.json({
            ok: true,
            seeded: created.length,
            products: created,
            message: `Đã tạo ${created.length} sản phẩm SMK trên Hub marketplace.`,
        }, { status: 201 });
    } catch (err) {
        console.error('Seed SMK error:', err);
        return NextResponse.json({ error: String(err), message: 'Seed thất bại' }, { status: 500 });
    }
}
