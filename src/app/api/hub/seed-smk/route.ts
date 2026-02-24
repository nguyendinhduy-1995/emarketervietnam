import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/hub/seed-smk — Seed Sieuthimatkinh CRM + add-on products onto Hub marketplace
export async function POST() {
    // Check if SMK products already exist
    const existing = await db.product.count({ where: { key: { startsWith: 'SMK_' } } });
    if (existing > 0) {
        return NextResponse.json({ message: `Đã có ${existing} sản phẩm SMK. Bỏ qua seed.`, seeded: 0 });
    }

    // ─── Main CRM Product ──────────────────────────────
    const mainProduct = {
        key: 'SMK_CRM_CORE',
        slug: 'smk-crm-matkinh',
        name: 'Siêu Thị Mắt Kính CRM',
        tagline: 'Quản lý cửa hàng mắt kính chuyên nghiệp',
        type: 'CRM',
        billingModel: 'SUBSCRIPTION',
        deliveryMethod: 'PROVISION_TENANT',
        status: 'PUBLISHED',
        isActive: true,
        industry: ['OPTICAL', 'RETAIL'],
        priceAmount: 690000,
        priceCurrency: 'VND',
        priceUnit: 'tháng',
        compareAtPrice: 1290000,
        shortDesc: 'Quản lý sản phẩm, đơn hàng, khách hàng cho cửa hàng mắt kính. Bao gồm POS, kho hàng cơ bản, phân tích.',
        longDesc: 'Hệ thống CRM toàn diện cho cửa hàng mắt kính: quản lý sản phẩm (gọng, tròng, phụ kiện), đơn hàng, khách hàng, báo cáo doanh thu. Hỗ trợ multi-chi nhánh.',
        features: JSON.stringify([
            { text: 'Quản lý sản phẩm kính (gọng, tròng, phụ kiện)', included: true },
            { text: 'Đơn hàng + thanh toán đa kênh (COD, VNPay, MoMo)', included: true },
            { text: 'Quản lý khách hàng & lịch sử mua', included: true },
            { text: 'Dashboard phân tích doanh thu', included: true },
            { text: 'Mã giảm giá / coupon', included: true },
            { text: 'PWA - hoạt động offline', included: true },
            { text: 'Nhiều nhân viên, phân quyền', included: true },
            { text: 'SEO cơ bản (sitemap, meta tags)', included: true },
        ]),
        faq: JSON.stringify([
            { q: 'Có dùng thử miễn phí không?', a: 'Có! 14 ngày dùng thử đầy đủ tính năng, không cần thẻ.' },
            { q: 'Hỗ trợ bao nhiêu nhân viên?', a: 'Gói Core hỗ trợ tối đa 5 nhân viên. Nâng cấp để thêm.' },
            { q: 'Dữ liệu có an toàn không?', a: 'Dữ liệu được mã hóa, backup tự động hàng ngày.' },
        ]),
        sortOrder: 10,
    };

    // ─── Add-on Products ───────────────────────────────
    const addons = [
        {
            key: 'SMK_ADV_SHIPPING', slug: 'smk-addon-shipping',
            name: 'Multi-carrier Shipping', tagline: 'GHN, GHTK, ViettelPost, J&T, NinjaVan',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 290000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Tích hợp đa nhà vận chuyển, tracking tự động, webhook realtime.',
            features: JSON.stringify([{ text: 'GHN, GHTK, ViettelPost, J&T, NinjaVan', included: true }, { text: 'Tracking realtime', included: true }, { text: 'Webhook auto-update', included: true }]),
            faq: '[]', sortOrder: 20,
        },
        {
            key: 'SMK_ADV_WAREHOUSE', slug: 'smk-addon-warehouse',
            name: 'Kho hàng & Kiểm kê', tagline: 'Multi-warehouse, vouchers, stocktake, ledger',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 290000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Quản lý nhiều kho, phiếu nhập/xuất/điều chỉnh, kiểm kê tồn kho.',
            features: JSON.stringify([{ text: 'Multi-warehouse', included: true }, { text: 'Phiếu nhập/xuất/điều chỉnh', included: true }, { text: 'Kiểm kê stocktake', included: true }]),
            faq: '[]', sortOrder: 21,
        },
        {
            key: 'SMK_ADV_PARTNER', slug: 'smk-addon-partner',
            name: 'Affiliate / Đối tác Portal', tagline: 'Partner portal, commission, payouts, fraud detection',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 490000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Portal đối tác riêng, hoa hồng tự động, chi trả, phát hiện gian lận.',
            features: JSON.stringify([{ text: '10 trang portal đối tác', included: true }, { text: 'Commission rules linh hoạt', included: true }, { text: 'Wallet & payouts', included: true }, { text: 'Fraud detection', included: true }]),
            faq: '[]', sortOrder: 22,
        },
        {
            key: 'SMK_ADV_RETURNS', slug: 'smk-addon-returns',
            name: 'Đổi trả / Bảo hành', tagline: 'RMA, warranty, exchange flow',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 190000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Quản lý đổi trả, bảo hành, trao đổi sản phẩm có quy trình duyệt.',
            features: JSON.stringify([{ text: 'Đổi trả / bảo hành / trao đổi', included: true }, { text: 'Upload ảnh/video bằng chứng', included: true }, { text: 'Admin approval flow', included: true }]),
            faq: '[]', sortOrder: 23,
        },
        {
            key: 'SMK_ADV_REVIEWS', slug: 'smk-addon-reviews',
            name: 'Đánh giá & Q&A', tagline: 'Reviews, questions, spam detection',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 190000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Hệ thống đánh giá sản phẩm, Q&A, phát hiện spam, verified reviews.',
            features: JSON.stringify([{ text: 'Rating + media reviews', included: true }, { text: 'Q&A section', included: true }, { text: 'Spam detection', included: true }]),
            faq: '[]', sortOrder: 24,
        },
        {
            key: 'SMK_ADV_AI', slug: 'smk-addon-ai',
            name: 'AI Content Creator', tagline: 'AI content generation cho sản phẩm kính',
            type: 'APP', billingModel: 'PAYG', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 0, priceCurrency: 'VND', priceUnit: 'lượt',
            shortDesc: 'Tạo mô tả sản phẩm bằng AI cho website, Facebook, TikTok, Zalo.',
            features: JSON.stringify([{ text: 'Multi-platform content', included: true }, { text: '4 tone of voice', included: true }, { text: 'One-click apply', included: true }]),
            faq: '[]', sortOrder: 25,
        },
        {
            key: 'SMK_ADV_ANALYTICS', slug: 'smk-addon-analytics',
            name: 'Advanced Analytics', tagline: 'Revenue, cohorts, funnels, product performance',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 390000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Phân tích nâng cao: doanh thu, cohort khách hàng, funnel chuyển đổi.',
            features: JSON.stringify([{ text: 'Revenue analytics', included: true }, { text: 'Customer cohorts', included: true }, { text: 'Conversion funnels', included: true }]),
            faq: '[]', sortOrder: 26,
        },
        {
            key: 'SMK_ADV_AUTOMATION', slug: 'smk-addon-automation',
            name: 'Marketing Automation', tagline: 'Triggers, scheduled tasks, abandoned cart',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 390000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Tự động hóa marketing: email/SMS triggers, nhắc giỏ hàng bỏ quên.',
            features: JSON.stringify([{ text: 'Email/SMS triggers', included: true }, { text: 'Abandoned cart recovery', included: true }, { text: 'Scheduled campaigns', included: true }]),
            faq: '[]', sortOrder: 27,
        },
        {
            key: 'SMK_ADV_TRYON', slug: 'smk-addon-tryon',
            name: 'Virtual Try-on (AR)', tagline: 'Thử kính ảo bằng camera AR',
            type: 'APP', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL'],
            priceAmount: 490000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Khách hàng thử kính ảo bằng camera. Face detection + overlay kính.',
            features: JSON.stringify([{ text: 'AR face detection', included: true }, { text: 'Realtime overlay', included: true }, { text: 'Mobile-first', included: true }]),
            faq: '[]', sortOrder: 28,
        },
        {
            key: 'SMK_ADV_LOYALTY', slug: 'smk-addon-loyalty',
            name: 'Loyalty & Points', tagline: 'Tích điểm, đổi thưởng, membership tiers',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 290000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Chương trình loyalty: tích điểm khi mua, đổi thưởng, hạng thành viên.',
            features: JSON.stringify([{ text: 'Tích điểm tự động', included: true }, { text: 'Đổi thưởng / voucher', included: true }, { text: 'Membership tiers', included: true }]),
            faq: '[]', sortOrder: 29,
        },
        {
            key: 'SMK_ADV_PRESCRIPTION', slug: 'smk-addon-prescription',
            name: 'Đơn thuốc mắt', tagline: 'Nhập đơn thuốc SPH/CYL/AXIS/PD, upload ảnh',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL'],
            priceAmount: 190000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Quản lý đơn thuốc mắt: nhập SPH/CYL/AXIS/PD, upload ảnh đơn.',
            features: JSON.stringify([{ text: 'Form đơn thuốc chuẩn', included: true }, { text: 'Upload ảnh đơn', included: true }, { text: 'Gắn vào đơn hàng', included: true }]),
            faq: '[]', sortOrder: 30,
        },
        {
            key: 'SMK_ADV_SEO', slug: 'smk-addon-seo',
            name: 'SEO Tools Pro', tagline: 'Meta editor nâng cao, structured data, SEO audit',
            type: 'CRM', billingModel: 'ONE_TIME', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 990000, priceCurrency: 'VND', priceUnit: 'trọn đời',
            shortDesc: 'Công cụ SEO nâng cao: meta editor, structured data, audit report.',
            features: JSON.stringify([{ text: 'Meta editor nâng cao', included: true }, { text: 'Structured data auto', included: true }, { text: 'SEO audit report', included: true }]),
            faq: '[]', sortOrder: 31,
        },
        {
            key: 'SMK_ADV_SUPPORT', slug: 'smk-addon-support',
            name: 'Customer Support', tagline: 'Ticket system, live chat, FAQ management',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 290000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Hệ thống hỗ trợ khách hàng: ticket, live chat, quản lý FAQ.',
            features: JSON.stringify([{ text: 'Ticket system', included: true }, { text: 'Live chat widget', included: true }, { text: 'FAQ management', included: true }]),
            faq: '[]', sortOrder: 32,
        },
        {
            key: 'SMK_ADV_SHOP_EXTRAS', slug: 'smk-addon-shop-extras',
            name: 'Shop Extras', tagline: 'Wishlist, Compare, Quiz, Blog, Booking, Bundle',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'ENTITLEMENT_FLAG',
            status: 'PUBLISHED', isActive: true, industry: ['OPTICAL', 'RETAIL'],
            priceAmount: 190000, priceCurrency: 'VND', priceUnit: 'tháng',
            shortDesc: 'Tính năng shop mở rộng: wishlist, so sánh, quiz tìm kính, blog, booking.',
            features: JSON.stringify([{ text: 'Wishlist', included: true }, { text: 'So sánh sản phẩm', included: true }, { text: 'Quiz tìm kính phù hợp', included: true }, { text: 'Blog', included: true }, { text: 'Đặt lịch hẹn', included: true }]),
            faq: '[]', sortOrder: 33,
        },
    ];

    const allProducts = [mainProduct, ...addons];
    const created = [];

    for (const p of allProducts) {
        const product = await db.product.create({ data: p as never });
        created.push({ id: product.id, key: (p as { key: string }).key, name: product.name });
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
}
