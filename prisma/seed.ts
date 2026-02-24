import { PrismaClient } from '../node_modules/.prisma/platform';

const db = new PrismaClient();

async function seed() {
    console.log('🌱 Seeding dữ liệu mẫu...');

    // ═══════ 1. Products (Marketplace) ═══════
    console.log('📦 Seeding Products...');
    const products = [
        {
            key: 'spa-crm', slug: 'spa-crm', name: 'eMarketer CRM',
            tagline: 'Quản lý khách hàng, lịch hẹn, doanh thu cho Spa & Salon',
            outcomeText: 'Tăng 30% tỷ lệ khách quay lại nhờ chăm sóc tự động',
            industry: ['SPA'], icon: '💆', priceMonthly: 299000, sortOrder: 1,
            features: [
                { text: 'Quản lý khách hàng không giới hạn', included: true },
                { text: 'Lịch hẹn & nhắc nhở tự động', included: true },
                { text: 'Phiếu thu & doanh thu', included: true },
                { text: 'AI phân tích kinh doanh', included: true },
                { text: 'Dashboard thời gian thực', included: true },
            ],
            faq: [
                { q: 'Bao lâu có thể bắt đầu dùng?', a: 'Chỉ 30 giây đăng ký là có thể sử dụng ngay.' },
                { q: 'có giới hạn số lượng khách hàng?', a: 'Không, bạn có thể thêm không giới hạn khách hàng.' },
            ],
        },
        {
            key: 'sales-pipeline', slug: 'sales-pipeline', name: 'Sales Pipeline',
            tagline: 'Quản lý quy trình bán hàng từ lead đến chốt đơn',
            outcomeText: 'Tăng 40% tỷ lệ chuyển đổi lead thành khách hàng',
            industry: ['SALES'], icon: '📊', priceMonthly: 399000, sortOrder: 2,
            features: [
                { text: 'Kanban pipeline trực quan', included: true },
                { text: 'Theo dõi deal & revenue forecast', included: true },
                { text: 'Email automation', included: true },
                { text: 'Báo cáo hiệu suất team', included: true },
                { text: 'Tích hợp Zalo, Facebook', included: true },
            ],
            faq: [
                { q: 'Có thể tích hợp với email?', a: 'Có, hỗ trợ tích hợp Gmail và Outlook.' },
            ],
        },
        {
            key: 'booking-app', slug: 'booking-app', name: 'Booking Online',
            tagline: 'Khách hàng tự đặt lịch 24/7 qua link của bạn',
            outcomeText: 'Giảm 80% thời gian xử lý đặt lịch thủ công',
            industry: ['SPA', 'PERSONAL'], icon: '📅', priceMonthly: 199000, sortOrder: 3,
            features: [
                { text: 'Link đặt lịch riêng', included: true },
                { text: 'Nhắc lịch qua SMS/Zalo', included: true },
                { text: 'Quản lý slot theo nhân viên', included: true },
                { text: 'Thanh toán trước online', included: false },
            ],
            faq: [
                { q: 'Khách đặt lịch qua đâu?', a: 'Qua link riêng của bạn, chia sẻ trên mạng xã hội hoặc website.' },
            ],
        },
        {
            key: 'loyalty-program', slug: 'loyalty-program', name: 'Loyalty & Thẻ thành viên',
            tagline: 'Tích điểm, ưu đãi giữ chân khách hàng trung thành',
            outcomeText: 'Tăng 50% tỷ lệ khách quay lại với chương trình tích điểm',
            industry: ['SPA', 'SALES', 'PERSONAL'], icon: '🎯', priceMonthly: 149000, sortOrder: 4,
            features: [
                { text: 'Thẻ thành viên điện tử', included: true },
                { text: 'Tích điểm tự động', included: true },
                { text: 'Voucher & ưu đãi sinh nhật', included: true },
                { text: 'Phân hạng VIP', included: true },
            ],
            faq: [],
        },
        {
            key: 'ai-marketing', slug: 'ai-marketing', name: 'AI Marketing Suite',
            tagline: 'Viết content, phân tích dữ liệu, tối ưu chiến dịch bằng AI',
            outcomeText: 'Tiết kiệm 10+ giờ/tuần viết nội dung marketing',
            industry: ['SPA', 'SALES', 'PERSONAL'], icon: '🤖', priceMonthly: 99000, sortOrder: 5,
            features: [
                { text: 'AI viết bài Facebook, Zalo', included: true },
                { text: 'AI phân tích doanh thu', included: true },
                { text: 'Gợi ý chiến lược kinh doanh', included: true },
                { text: 'Chatbot tư vấn tự động', included: false },
            ],
            faq: [
                { q: 'AI viết bằng tiếng Việt?', a: 'Có, AI được huấn luyện chuyên biệt cho tiếng Việt.' },
            ],
        },
    ];

    for (const p of products) {
        await db.product.upsert({
            where: { key: p.key },
            update: { ...p },
            create: { ...p },
        });
    }
    console.log(`  ✅ ${products.length} products`);

    // ═══════ 2. BankAccount ═══════
    console.log('🏦 Seeding BankAccount...');
    const existing = await db.bankAccount.findFirst({ where: { isActive: true } });
    if (!existing) {
        await db.bankAccount.create({
            data: {
                bankName: 'Vietcombank',
                bankCode: 'VCB',
                bin: '970436',
                accountNumber: '1234567890',
                accountName: 'EMARKETERVN JSC',
                isActive: true,
            },
        });
        console.log('  ✅ 1 bank account');
    } else {
        console.log('  ⏭️ Bank account đã tồn tại');
    }

    // ═══════ 3. CMS Posts ═══════
    console.log('📝 Seeding CMS Posts...');
    const posts = [
        {
            slug: 'welcome-emk-hub',
            title: 'Chào mừng đến eMarketer Hub!',
            excerpt: 'Hướng dẫn nhanh bắt đầu sử dụng nền tảng quản lý kinh doanh thông minh.',
            body: 'eMarketer Hub giúp bạn quản lý toàn bộ hoạt động kinh doanh trên một nền tảng duy nhất.\n\nBắt đầu bằng cách khám phá Giải pháp phù hợp với ngành của bạn, nạp tiền vào Ví, và kích hoạt các tính năng mạnh mẽ.\n\nLiên hệ đội ngũ hỗ trợ nếu cần trợ giúp!',
            category: 'Hướng dẫn',
            status: 'PUBLISHED',
        },
        {
            slug: 'ai-marketing-tips',
            title: '5 mẹo dùng AI Marketing hiệu quả',
            excerpt: 'Tận dụng sức mạnh AI để viết content hấp dẫn và phân tích khách hàng.',
            body: 'AI Marketing Suite giúp bạn tiết kiệm hàng giờ viết content mỗi tuần.\n\n1. Cung cấp context rõ ràng cho AI\n2. Chỉnh sửa kết quả AI cho phù hợp\n3. Sử dụng AI phân tích để hiểu khách hàng\n4. Tự động hoá lịch đăng bài\n5. Theo dõi hiệu quả và tối ưu liên tục',
            category: 'Tin tức',
            status: 'PUBLISHED',
        },
        {
            slug: 'uu-dai-tet-2026',
            title: 'Ưu đãi đặc biệt mùa Tết 2026',
            excerpt: 'Giảm 30% tất cả giải pháp khi nạp ví từ 1 triệu đồng trở lên.',
            body: 'Chương trình ưu đãi đặc biệt nhân dịp Tết 2026!\n\nNạp ví từ 1.000.000đ trở lên để nhận giảm giá 30% cho tất cả giải pháp trên Marketplace.\n\nThời gian: đến hết 28/02/2026.\n\nHãy nạp ngay để không bỏ lỡ!',
            category: 'Khuyến mãi',
            status: 'PUBLISHED',
        },
    ];

    // Need a userId for authorId
    const anyUser = await db.user.findFirst();
    const authorId = anyUser?.id || 'system';

    for (const p of posts) {
        const exists = await db.cmsPost.findUnique({ where: { slug: p.slug } });
        if (!exists) {
            await db.cmsPost.create({ data: { ...p, authorId } });
        }
    }
    console.log(`  ✅ ${posts.length} CMS posts`);

    // ═══════ 4. AffiliateAccount + Referrals ═══════
    console.log('🤝 Seeding Affiliates...');
    if (anyUser?.email) {
        const existingAff = await db.affiliateAccount.findUnique({ where: { email: anyUser.email } });
        if (!existingAff) {
            const aff = await db.affiliateAccount.create({
                data: {
                    name: anyUser.name || 'Đại lý Demo',
                    email: anyUser.email,
                    phone: anyUser.phone || null,
                    status: 'ACTIVE',
                },
            });
            const refCode = `REF-${anyUser.id.slice(-6).toUpperCase()}`;
            // Create demo affiliate link
            await db.affiliateLink.create({
                data: {
                    affiliateId: aff.id,
                    refCode,
                    targetUrl: '/',
                },
            });
            // Create demo leads + referrals
            const statuses = ['CLICKED', 'LEAD', 'TRIAL', 'PAID', 'PAID'];
            for (let i = 0; i < 5; i++) {
                const lead = await db.emkLead.create({
                    data: {
                        name: `Khách giới thiệu ${i + 1}`,
                        phone: `090${1000000 + i}`,
                        source: 'REFERRAL',
                        status: statuses[i] === 'PAID' ? 'WON' : 'NEW',
                    },
                });
                await db.referral.create({
                    data: {
                        affiliateId: aff.id,
                        leadId: lead.id,
                        refCode,
                        clickedAt: new Date(Date.now() - (10 - i) * 86400000),
                        status: statuses[i],
                        convertedAt: statuses[i] === 'PAID' ? new Date(Date.now() - i * 86400000) : null,
                    },
                });
            }
            console.log('  ✅ 1 affiliate + 5 leads + 5 referrals');
        } else {
            console.log('  ⏭️ Affiliate đã tồn tại');
        }
    } else {
        console.log('  ⚠️ Không có user email để tạo affiliate');
    }

    console.log('\n🎉 Seed hoàn tất!');
}

seed()
    .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
    .finally(() => db.$disconnect());
