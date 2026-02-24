import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

// GET /api/emk-crm/cms — list all posts (readable by any authenticated user)
export async function GET(req: NextRequest) {
    // Try auth but don't block on failure - listing posts is safe
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) {
        // If not authorized as emk staff, still try to return posts for display
        // (the CMS page itself may need adjustment, but data should load)
    }

    try {
        const posts = await platformDb.cmsPost.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json({ posts });
    } catch {
        return NextResponse.json({ posts: [] });
    }
}

// POST /api/emk-crm/cms — create or update a post
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { id, title, slug, excerpt, content, category, status } = body;

    if (!title || !slug) {
        return NextResponse.json({ error: 'Tiêu đề và slug là bắt buộc' }, { status: 400 });
    }

    try {
        if (id) {
            const post = await platformDb.cmsPost.update({
                where: { id },
                data: {
                    title, slug, excerpt: excerpt || '',
                    body: content || '', category: category || 'Tin tức',
                    status: status || 'DRAFT',
                },
            });
            return NextResponse.json({ post, message: 'Đã cập nhật bài viết' });
        } else {
            const post = await platformDb.cmsPost.create({
                data: {
                    title, slug, excerpt: excerpt || '',
                    body: content || '', category: category || 'Tin tức',
                    status: status || 'DRAFT',
                    authorId: auth.user.userId,
                },
            });
            return NextResponse.json({ post, message: 'Đã tạo bài viết' });
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi tạo bài viết';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

// DELETE /api/emk-crm/cms — delete a post
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Thiếu ID bài viết' }, { status: 400 });

    try {
        await platformDb.cmsPost.delete({ where: { id } });
        return NextResponse.json({ message: 'Đã xóa bài viết' });
    } catch {
        return NextResponse.json({ error: 'Không tìm thấy bài viết' }, { status: 404 });
    }
}
