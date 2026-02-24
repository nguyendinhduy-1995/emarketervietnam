import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) return NextResponse.json({ members: [] });

    const memberships = await platformDb.membership.findMany({
        where: { workspaceId: wsId },
        include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { createdAt: 'asc' },
    });

    const members = memberships.map(m => ({
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        phone: m.user.phone,
        role: m.role,
        joinedAt: m.createdAt,
    }));

    return NextResponse.json({ members });
}

export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const callerMembership = await platformDb.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: user.userId } },
    });
    if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role)) {
        return NextResponse.json({ error: 'Không có quyền mời thành viên' }, { status: 403 });
    }

    const body = await req.json();
    const { email, phone, role = 'STAFF' } = body;

    if (!email && !phone) {
        return NextResponse.json({ error: 'Vui lòng nhập email hoặc số điện thoại' }, { status: 400 });
    }

    const targetUser = await platformDb.user.findFirst({
        where: email ? { email } : { phone },
    });

    if (!targetUser) {
        return NextResponse.json({ error: 'Chưa tìm thấy người dùng. Họ cần đăng ký trước.' }, { status: 404 });
    }

    const existing = await platformDb.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: targetUser.id } },
    });
    if (existing) {
        return NextResponse.json({ error: 'Người này đã là thành viên' }, { status: 409 });
    }

    await platformDb.membership.create({
        data: { workspaceId: wsId, userId: targetUser.id, role },
    });

    return NextResponse.json({ ok: true, message: 'Đã mời thành viên thành công!' });
}

export async function PATCH(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    // Only OWNER can change roles
    const callerMembership = await platformDb.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: user.userId } },
    });
    if (!callerMembership || callerMembership.role !== 'OWNER') {
        return NextResponse.json({ error: 'Chỉ chủ sở hữu mới có thể đổi vai trò' }, { status: 403 });
    }

    const body = await req.json();
    const { membershipId, role } = body;

    if (!membershipId || !role || !['ADMIN', 'STAFF'].includes(role)) {
        return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
    }

    // Cannot change own role
    const target = await platformDb.membership.findUnique({ where: { id: membershipId } });
    if (!target || target.workspaceId !== wsId) {
        return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
    }
    if (target.userId === user.userId) {
        return NextResponse.json({ error: 'Không thể đổi vai trò của chính mình' }, { status: 400 });
    }
    if (target.role === 'OWNER') {
        return NextResponse.json({ error: 'Không thể đổi vai trò chủ sở hữu' }, { status: 403 });
    }

    await platformDb.membership.update({
        where: { id: membershipId },
        data: { role },
    });

    return NextResponse.json({ ok: true, message: 'Đã cập nhật vai trò' });
}

export async function DELETE(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const wsId = await resolveWorkspaceId(req, user);
    if (!wsId) return NextResponse.json({ error: 'No workspace' }, { status: 400 });

    const callerMembership = await platformDb.membership.findUnique({
        where: { workspaceId_userId: { workspaceId: wsId, userId: user.userId } },
    });
    if (!callerMembership || !['OWNER', 'ADMIN'].includes(callerMembership.role)) {
        return NextResponse.json({ error: 'Không có quyền xoá thành viên' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const membershipId = searchParams.get('id');
    if (!membershipId) {
        return NextResponse.json({ error: 'Thiếu ID thành viên' }, { status: 400 });
    }

    const target = await platformDb.membership.findUnique({ where: { id: membershipId } });
    if (!target || target.workspaceId !== wsId) {
        return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
    }
    if (target.role === 'OWNER') {
        return NextResponse.json({ error: 'Không thể xoá chủ sở hữu' }, { status: 403 });
    }
    if (target.userId === user.userId) {
        return NextResponse.json({ error: 'Không thể xoá chính mình' }, { status: 400 });
    }

    await platformDb.membership.delete({ where: { id: membershipId } });

    return NextResponse.json({ ok: true, message: 'Đã xoá thành viên' });
}
