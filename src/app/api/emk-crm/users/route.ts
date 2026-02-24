import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { hashPassword } from '@/lib/auth/password';

async function logEvent(actorUserId: string, type: string, detail: string) {
    await platformDb.eventLog.create({
        data: { actorUserId, type, payloadJson: { detail } },
    });
}

// GET /api/emk-crm/users — list all platform users with activity
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    // Only show CRM staff (isAdmin or has emkRole)
    const staffFilter = { OR: [{ isAdmin: true }, { emkRole: { not: null } }] } as Record<string, unknown>;
    const where: Record<string, unknown> = { AND: [staffFilter] };
    if (search) {
        (where.AND as unknown[]).push({
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
            ],
        });
    }
    if (role) (where.AND as unknown[]).push({ emkRole: role });
    if (status) (where.AND as unknown[]).push({ status });

    const users = await platformDb.user.findMany({
        where,
        select: {
            id: true, name: true, email: true, phone: true,
            emkRole: true, status: true, isAdmin: true,
            createdAt: true, updatedAt: true,
            _count: { select: { eventLogs: true, emkTasksOwned: true } },
        },
        orderBy: { createdAt: 'desc' },
    });

    // Get recent activity logs
    const recentLogs = await platformDb.eventLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
            id: true, type: true, payloadJson: true, createdAt: true,
            actor: { select: { id: true, name: true } },
        },
    });

    return NextResponse.json({ users, recentLogs });
}

// POST /api/emk-crm/users — create user or update user
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action, userId, name, phone, email, password, emkRole, status } = body;

    try {
        if (action === 'create') {
            if (!name || !phone || !password || !emkRole) {
                return NextResponse.json({ error: 'Tên, SĐT, mật khẩu và vai trò là bắt buộc' }, { status: 400 });
            }
            const existing = await platformDb.user.findUnique({ where: { phone } });
            if (existing) {
                return NextResponse.json({ error: 'Số điện thoại đã tồn tại' }, { status: 400 });
            }
            const passwordHash = await hashPassword(password);
            const user = await platformDb.user.create({
                data: { name, phone, email: email || null, passwordHash, emkRole: emkRole || null, status: 'ACTIVE' },
            });
            await logEvent(auth.user.userId, 'USER_CREATED', `Tạo người dùng: ${name} (${phone})`);
            return NextResponse.json({ user, message: `Đã tạo người dùng ${name}` });
        }

        if (action === 'update') {
            if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });

            const updateData: Record<string, unknown> = {};
            if (name !== undefined) updateData.name = name;
            if (email !== undefined) updateData.email = email || null;
            if (emkRole !== undefined) updateData.emkRole = emkRole || null;
            if (status !== undefined) updateData.status = status;
            if (password) updateData.passwordHash = await hashPassword(password);

            const user = await platformDb.user.update({ where: { id: userId }, data: updateData });

            const changes = [];
            if (emkRole !== undefined) changes.push(`role→${emkRole || 'null'}`);
            if (status !== undefined) changes.push(`status→${status}`);
            if (name !== undefined) changes.push(`name→${name}`);
            await logEvent(auth.user.userId, 'USER_UPDATED', `Cập nhật ${user.name}: ${changes.join(', ')}`);
            return NextResponse.json({ user, message: `Đã cập nhật ${user.name}` });
        }

        if (action === 'toggle-status') {
            if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
            const user = await platformDb.user.findUnique({ where: { id: userId } });
            if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
            const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
            await platformDb.user.update({ where: { id: userId }, data: { status: newStatus } });
            await logEvent(auth.user.userId, 'USER_STATUS_CHANGED', `${user.name}: ${user.status} → ${newStatus}`);
            return NextResponse.json({ message: `${user.name} → ${newStatus}` });
        }

        if (action === 'reset-password') {
            if (!userId || !password) return NextResponse.json({ error: 'Thiếu userId hoặc password' }, { status: 400 });
            const passwordHash = await hashPassword(password);
            const user = await platformDb.user.update({ where: { id: userId }, data: { passwordHash } });
            await logEvent(auth.user.userId, 'PASSWORD_RESET', `Reset mật khẩu: ${user.name}`);
            return NextResponse.json({ message: `Đã reset mật khẩu cho ${user.name}` });
        }

        return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi xử lý';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
