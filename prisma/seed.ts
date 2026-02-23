import { platformDb } from '../src/lib/db/platform';
import { DEFAULT_MODULES } from '../src/lib/constants';
import { hashPassword } from '../src/lib/auth/password';

async function seed() {
    console.log('🌱 Seeding platform database...');

    // 1. Seed modules
    for (const mod of DEFAULT_MODULES) {
        await platformDb.module.upsert({
            where: { key: mod.key },
            create: mod,
            update: mod,
        });
        console.log(`  ✓ Module: ${mod.name}`);
    }

    // 2. Seed plans
    const plans = [
        { key: 'FREE', name: 'Free', limitsJson: { maxCustomers: 100, maxStaff: 1 } },
        { key: 'STARTER', name: 'Starter', limitsJson: { maxCustomers: 1000, maxStaff: 3 } },
        { key: 'PRO', name: 'Pro', limitsJson: { maxCustomers: -1, maxStaff: -1 } },
    ];
    for (const plan of plans) {
        await platformDb.plan.upsert({
            where: { key: plan.key },
            create: plan,
            update: plan,
        });
        console.log(`  ✓ Plan: ${plan.name}`);
    }

    // 3. Seed admin user
    const adminEmail = 'admin@emarketervietnam.vn';
    const existing = await platformDb.user.findUnique({ where: { email: adminEmail } });
    if (!existing) {
        await platformDb.user.create({
            data: {
                email: adminEmail,
                passwordHash: await hashPassword('admin123'),
                name: 'Admin',
                isAdmin: true,
            },
        });
        console.log(`  ✓ Admin user: ${adminEmail} / admin123`);
    }

    // 4. Seed help docs
    const helpDocs = [
        { productKey: 'SPA_CRM', title: 'Bắt đầu với Spa CRM', slug: 'getting-started', contentMd: '# Bắt đầu\n\nChào mừng bạn đến với Spa CRM! Hãy hoàn thành onboarding checklist 5 bước để setup nhanh nhất.\n\n## Bước 1: Thiết lập dịch vụ\nVào mục **Dịch vụ** → Nhấn **+ Thêm dịch vụ** → Nhập tên, thời gian, giá.\n\n## Bước 2: Thêm nhân viên\nVào **Hub Portal** → **Users & Roles** → Mời nhân viên qua email.\n\n## Bước 3: Tạo lịch hẹn\nVào **Lịch hẹn** → Đặt lịch cho khách hàng.\n\n## Bước 4: Tạo phiếu thu\nKhi khách thanh toán → Tạo phiếu thu để ghi nhận doanh thu.\n\n## Bước 5: Xem báo cáo\nDashboard sẽ hiển thị tổng quan doanh thu và hoạt động.', sortOrder: 1 },
        { productKey: 'SPA_CRM', title: 'Quản lý Khách hàng', slug: 'customer-management', contentMd: '# Quản lý Khách hàng\n\n## Thêm khách hàng\n- Nhấn **+ Thêm khách** ở trang Khách hàng\n- Nhập tên (bắt buộc), SĐT, email\n- Thêm ghi chú nếu cần\n\n## Tìm kiếm\nSử dụng ô tìm kiếm để lọc theo tên hoặc SĐT.', sortOrder: 2 },
        { productKey: 'SPA_CRM', title: 'Quản lý Lịch hẹn', slug: 'appointment-management', contentMd: '# Quản lý Lịch hẹn\n\n## Tạo lịch hẹn\n- Chọn khách hàng, dịch vụ, thời gian bắt đầu/kết thúc\n- Trạng thái mặc định: SCHEDULED\n\n## Trạng thái lịch hẹn\n- SCHEDULED → CONFIRMED → IN_PROGRESS → COMPLETED\n- CANCELLED / NO_SHOW cho các trường hợp đặc biệt', sortOrder: 3 },
        { productKey: 'SPA_CRM', title: 'Marketplace & Module', slug: 'marketplace-modules', contentMd: '# Marketplace & Module\n\n## Module có sẵn\n- **Inbox**: Tin nhắn đa kênh\n- **Automation**: Nhắc lịch tự động\n- **Membership**: Thẻ thành viên\n- **Booking**: Đặt lịch online\n- **Analytics**: Báo cáo chi tiết\n- **AI Suite**: Trợ lý AI\n\n## Cách nâng cấp\n1. Vào **Marketplace** trên Hub Portal\n2. Chọn module → Nhấn **Nâng cấp**\n3. Chuyển khoản theo QR\n4. Module tự kích hoạt sau khi xác nhận', sortOrder: 4, moduleKey: null },
    ];

    for (const doc of helpDocs) {
        await platformDb.helpDoc.upsert({
            where: { slug: doc.slug },
            create: doc,
            update: doc,
        });
        console.log(`  ✓ Help doc: ${doc.title}`);
    }

    console.log('✅ Seed complete!');
}

seed()
    .catch(console.error)
    .finally(() => platformDb.$disconnect());
