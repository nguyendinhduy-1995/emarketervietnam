import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

const DEFAULT_TEMPLATES = [
    {
        id: 'welcome', name: 'Chào khách mới', category: 'WELCOME',
        subject: 'Chào mừng {{name}} đến eMarketer 🎉',
        body: `Chào {{name}},\n\nCảm ơn bạn đã quan tâm đến eMarketer! Chúng tôi rất vui được hỗ trợ bạn.\n\nBước tiếp theo:\n1. Đăng nhập Hub\n2. Tạo không gian làm việc\n3. Nhập dữ liệu khách hàng\n\nTrân trọng,\nĐội ngũ eMarketer`,
        isDefault: true,
    },
    {
        id: 'trial-reminder', name: 'Nhắc dùng thử', category: 'FOLLOW_UP',
        subject: '⏰ {{name}}, còn {{trial_days_left}} ngày dùng thử!',
        body: `Chào {{name}},\n\nGói dùng thử còn {{trial_days_left}} ngày.\n\n👉 Nâng cấp ngay: {{upgrade_link}}\n\nTrân trọng,\nĐội ngũ eMarketer`,
        isDefault: true,
    },
    {
        id: 're-engage', name: 'Kích hoạt lại', category: 'PROMO',
        subject: '🤝 {{name}}, chúng tôi nhớ bạn!',
        body: `Chào {{name}},\n\nChúng tôi đã cập nhật:\n- 🤖 AI thông minh\n- 📊 Dashboard nâng cao\n- 🔔 Thông báo tự động\n\nTrân trọng,\nĐội ngũ eMarketer`,
        isDefault: true,
    },
    {
        id: 'renewal', name: 'Nhắc gia hạn', category: 'RENEWAL',
        subject: '♻️ {{name}}, gói của bạn sắp hết hạn',
        body: `Chào {{name}},\n\nGói {{plan}} sẽ hết hạn vào {{expiry_date}}.\n\nGia hạn ngay để không bị gián đoạn dịch vụ.\n\n{{renewal_link}}\n\nTrân trọng,`,
        isDefault: true,
    },
];

// GET – List templates (defaults + DB)
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const category = url.searchParams.get('category');

    let dbTemplates: Array<{ id: string; name: string; subject: string; body: string; category: string; isActive: boolean; author: { name: string } | null }> = [];
    try {
        dbTemplates = await platformDb.emkEmailTemplate.findMany({
            where: category ? { category } : {},
            orderBy: { updatedAt: 'desc' },
            include: { author: { select: { name: true } } },
        });
    } catch {
        // Table may not exist yet or Prisma client needs regeneration
    }

    // Combine defaults (if not overridden) + DB templates
    const dbNames = dbTemplates.map(t => t.name);
    const defaults = DEFAULT_TEMPLATES
        .filter(d => !category || d.category === category)
        .filter(d => !dbNames.includes(d.name));

    return NextResponse.json({ templates: [...dbTemplates, ...defaults] });
}

// POST – Create template
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, subject, body: tplBody, category } = body;
    if (!name || !subject) return NextResponse.json({ error: 'Tên và tiêu đề bắt buộc' }, { status: 400 });

    const template = await platformDb.emkEmailTemplate.create({
        data: { name, subject, body: tplBody || '', category: category || 'GENERAL', createdBy: auth.user.id as string },
    });
    return NextResponse.json({ template });
}

// PATCH – Update template
export async function PATCH(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, name, subject, body: tplBody, category, isActive } = body;
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (subject !== undefined) data.subject = subject;
    if (tplBody !== undefined) data.body = tplBody;
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    const template = await platformDb.emkEmailTemplate.update({ where: { id }, data });
    return NextResponse.json({ template });
}

// DELETE – Delete template
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID' }, { status: 400 });

    await platformDb.emkEmailTemplate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
