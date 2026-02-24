import { NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

// POST /api/hub/seed-demo-accounts — Seed demo CRM accounts for testing
export async function POST() {
    try {
        const existing = await db.emkAccount.count();
        if (existing > 0) {
            return NextResponse.json({ message: `Đã có ${existing} tài khoản. Bỏ qua seed.`, seeded: 0 });
        }

        // Demo accounts with varied plans, statuses, and industries
        const accounts = [
            { name: 'Mắt Kính Ánh Sáng', slug: 'mk-anh-sang', product: 'OPTICAL', plan: 'PRO', status: 'ACTIVE' },
            { name: 'Kính Mắt Thời Trang 360', slug: 'km-thoi-trang', product: 'OPTICAL', plan: 'STARTER', status: 'ACTIVE' },
            { name: 'Spa Hoa Hồng', slug: 'spa-hoa-hong', product: 'SPA', plan: 'PRO', status: 'ACTIVE' },
            { name: 'Salon Beauty Plus', slug: 'salon-beauty-plus', product: 'SALON', plan: 'TRIAL', status: 'TRIAL' },
            { name: 'Phòng Khám Đông Y', slug: 'pk-dong-y', product: 'CLINIC', plan: 'STARTER', status: 'ACTIVE' },
            { name: 'Shop Kính Cao Cấp', slug: 'shop-kinh-cc', product: 'RETAIL', plan: 'TRIAL', status: 'TRIAL' },
            { name: 'Cửa Hàng Mắt Kính ABC', slug: 'ch-mk-abc', product: 'OPTICAL', plan: 'STARTER', status: 'INACTIVE' },
            { name: 'Spa Lavender', slug: 'spa-lavender', product: 'SPA', plan: 'PRO', status: 'ACTIVE' },
        ];

        const results = [];

        // Find existing user to own the demo org
        const user = await db.user.findFirst({ orderBy: { createdAt: 'asc' } });
        if (!user) return NextResponse.json({ error: 'Cần có ít nhất 1 user trong hệ thống' }, { status: 400 });

        // Create shared org for demo accounts
        const org = await db.org.create({
            data: { name: 'Demo Organization', ownerUserId: user.id },
        });

        for (const acct of accounts) {
            // Create workspace linked to org
            const workspace = await db.workspace.create({
                data: {
                    name: acct.name,
                    slug: acct.slug,
                    product: acct.product,
                    status: 'ACTIVE',
                    orgId: org.id,
                },
            });

            // Create EMK account
            const trialEnd = acct.plan === 'TRIAL'
                ? new Date(Date.now() + 7 * 86400000) // 7 days from now
                : null;

            const emkAccount = await db.emkAccount.create({
                data: {
                    workspaceId: workspace.id,
                    plan: acct.plan,
                    status: acct.status,
                    trialEndAt: trialEnd,
                    lastActivityAt: new Date(Date.now() - Math.random() * 30 * 86400000), // random within 30 days
                },
            });

            results.push({ id: emkAccount.id, name: acct.name, plan: acct.plan, status: acct.status });
        }

        return NextResponse.json({
            ok: true,
            message: `Đã tạo ${results.length} demo accounts`,
            accounts: results,
        });
    } catch (error) {
        console.error('[Seed Demo Accounts]', error);
        return NextResponse.json({ error: 'Lỗi seed accounts', detail: String(error) }, { status: 500 });
    }
}
