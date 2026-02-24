import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

// GET — list all categories
export async function GET() {
    const cats = await db.productCategory.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return NextResponse.json(cats);
}

// POST — create category
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { name, icon } = await req.json();
    if (!name) return NextResponse.json({ error: 'Tên danh mục là bắt buộc' }, { status: 400 });

    const slug = slugify(name);
    const existing = await db.productCategory.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'Danh mục đã tồn tại' }, { status: 400 });

    const cat = await db.productCategory.create({
        data: { name, slug, icon: icon || '📁' },
    });
    return NextResponse.json(cat, { status: 201 });
}

// PATCH — update category
export async function PATCH(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { id, name, icon, sortOrder } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name !== undefined) { data.name = name; data.slug = slugify(name); }
    if (icon !== undefined) data.icon = icon;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const cat = await db.productCategory.update({ where: { id }, data });
    return NextResponse.json(cat);
}

// DELETE — delete category
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    await db.productCategory.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
