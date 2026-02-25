import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/seed-products
 * Seed products with full Product Registry format:
 *   - imageRef, releaseVersion, demoUrl   → deploy config
 *   - planOptions[]                       → pricing tiers
 *   - addons[]                            → feature add-ons
 * Safe to re-run: skips if products already exist.
 */
export async function POST() {
    const existing = await db.product.count();
    if (existing > 0) {
        return NextResponse.json({ message: `Đã có ${existing} sản phẩm. Bỏ qua seed.`, seeded: 0 });
    }

    const products = [
        // ══ CRM SPA PRO ══════════════════════════════════════
        {
            key: 'CRM_SPA_PRO', slug: 'crm-spa-pro', name: 'CRM Spa Pro',
            type: 'CRM', billingModel: 'SUBSCRIPTION', deliveryMethod: 'PROVISION_TENANT',
            status: 'PUBLISHED', isActive: true,
            icon: '💆', tagline: 'Quản lý spa chuyên nghiệp, đặt lịch thông minh',
            description: 'Hệ thống CRM toàn diện cho spa & salon: quản lý khách hàng, đặt lịch, theo dõi dịch vụ, báo cáo doanh thu, loyalty program. Hỗ trợ multi-chi nhánh.',
            outcomeText: 'Tăng 30% lượng khách quay lại nhờ chăm sóc tự động',
            industry: ['SPA', 'SALON'],
            priceOriginal: 990000, priceRental: 490000, priceSale: 0,
            priceMonthly: 490000, priceYearly: 4900000,
            sortOrder: 1,

            // ── Deploy Config ──
            imageRef: 'registry.emk.vn/crm-spa:v1.0.0',
            releaseVersion: 'v1.0.0',
            demoUrl: 'https://crm-spa.emarketervietnam.vn',
            composeTemplate: '/opt/emk/templates/crm-compose.yml',
            envTemplate: {
                DATABASE_URL: 'postgresql://$DB_USER:$DB_PASS@localhost/$DB_NAME',
                HUB_API: 'https://hub.emarketervietnam.vn',
                WORKSPACE_ID: '$WORKSPACE_ID',
                INSTANCE_ID: '$INSTANCE_ID',
                ENTITLEMENT_SECRET: '$ENTITLEMENT_SECRET',
                DOMAIN: '$DOMAIN',
                NODE_ENV: 'production',
            },

            // ── Plan Options ──
            planOptions: [
                {
                    key: 'MONTHLY', label: 'Hàng tháng', price: 490000, cycle: 'MONTHLY',
                    features: ['CRM_CORE', 'CORE_DASHBOARD', 'CORE_LEADS', 'CORE_TASKS', 'CORE_BILLING'],
                },
                {
                    key: 'YEARLY', label: 'Hàng năm (−17%)', price: 4900000, cycle: 'YEARLY',
                    features: ['CRM_CORE', 'CORE_DASHBOARD', 'CORE_LEADS', 'CORE_TASKS', 'CORE_BILLING'],
                    discount: '17%',
                },
            ],

            // ── Add-ons ──
            addons: [
                { featureKey: 'AI_ASSISTANT', label: 'AI Trợ lý', price: 99000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'AI_ANALYTICS', label: 'AI Phân tích', price: 79000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'AI_LEAD_SCORE', label: 'AI Chấm điểm Lead', price: 59000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'AI_CHURN', label: 'AI Dự đoán rời bỏ', price: 59000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'AI_GENERATE', label: 'AI Tạo nội dung', price: 0, trialDays: 0, billing: 'PAYG', unitPrice: 2000 },
                { featureKey: 'AUTOMATION', label: 'Tự động hóa', price: 149000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'DRIP_CAMPAIGN', label: 'Chiến dịch Drip', price: 199000, trialDays: 0, billing: 'SUBSCRIPTION', requires: ['AUTOMATION'] },
                { featureKey: 'MESSAGING', label: 'Nhắn tin SMS/Zalo', price: 0, trialDays: 0, billing: 'PAYG', unitPrice: 500 },
                { featureKey: 'EMAIL_TEMPLATES', label: 'Mẫu Email', price: 49000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'DATA_EXPORT', label: 'Xuất dữ liệu', price: 49000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'CMS', label: 'CMS / Blog', price: 99000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'AFFILIATES', label: 'Hệ thống CTV', price: 149000, trialDays: 7, billing: 'SUBSCRIPTION' },
                { featureKey: 'ONLINE_BOOKING', label: 'Đặt lịch trực tuyến', price: 99000, trialDays: 7, billing: 'SUBSCRIPTION' },
            ],

            features: JSON.stringify([
                { text: 'Quản lý khách hàng không giới hạn', included: true },
                { text: 'Đặt lịch online', included: true },
                { text: 'Báo cáo doanh thu', included: true },
                { text: 'Loyalty & điểm thưởng', included: true },
                { text: 'Nhắc hẹn tự động (SMS/Zalo)', included: true },
                { text: 'Multi-chi nhánh', included: false },
            ]),
            faq: JSON.stringify([
                { q: 'Có dùng thử không?', a: 'Có! 7 ngày dùng thử miễn phí cho mỗi add-on.' },
                { q: 'Hỗ trợ bao nhiêu nhân viên?', a: 'Gói Pro hỗ trợ tối đa 20 nhân viên.' },
                { q: 'Deploy mất bao lâu?', a: 'Sau khi verify domain, CRM được triển khai tự động trong 5-10 phút.' },
            ]),
        },

        // ══ AI CONTENT CREATOR ═══════════════════════════════
        {
            key: 'APP_AI_CONTENT', slug: 'app-ai-content', name: 'AI Content Creator',
            type: 'APP', billingModel: 'PAYG', deliveryMethod: 'ENABLE_APP',
            status: 'PUBLISHED', isActive: true,
            icon: '🤖', tagline: 'Tạo nội dung marketing bằng AI, nhanh gấp 10 lần',
            description: 'Ứng dụng tạo nội dung tự động: bài viết Facebook, caption Instagram, email marketing, mô tả sản phẩm. Hỗ trợ tiếng Việt chuẩn SEO.',
            outcomeText: 'Tiết kiệm 5 giờ/tuần cho việc viết content',
            industry: ['SALES', 'PERSONAL'],
            priceOriginal: 0, priceRental: 0, priceSale: 0, priceMonthly: 0, priceYearly: 0,
            sortOrder: 2,
            planOptions: [
                { key: 'PAYG', label: 'Trả theo lượt', price: 0, cycle: 'PAYG', features: ['AI_GENERATE'] },
            ],
            addons: [],
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

        // ══ DIGITAL MARKETING GUIDE ══════════════════════════
        {
            key: 'DIG_MARKETING_GUIDE', slug: 'digital-marketing-guide', name: 'Tài liệu Digital Marketing A-Z',
            type: 'DIGITAL', billingModel: 'ONE_TIME', deliveryMethod: 'DOWNLOAD_GRANT',
            status: 'PUBLISHED', isActive: true,
            icon: '📚', tagline: 'Học digital marketing từ A-Z, thực chiến ngay',
            description: 'Bộ tài liệu 200+ trang: Facebook Ads, Google Ads, SEO, Email Marketing, Content Strategy. Kèm template + case study thực tế Việt Nam.',
            outcomeText: 'Nắm vững kiến thức digital marketing trong 30 ngày',
            industry: ['SALES', 'PERSONAL'],
            priceOriginal: 990000, priceRental: 0, priceSale: 499000, priceMonthly: 0, priceYearly: 0,
            sortOrder: 3,
            planOptions: [
                { key: 'ONE_TIME', label: 'Mua một lần', price: 499000, cycle: 'ONE_TIME', features: ['DIGITAL_ASSETS'] },
            ],
            addons: [],
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
