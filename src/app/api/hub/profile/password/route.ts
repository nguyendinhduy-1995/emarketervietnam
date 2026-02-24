import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { verifyPassword, hashPassword } from '@/lib/auth/password';

export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { user } = authResult;

    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
        return NextResponse.json({ error: 'Vui lòng nhập đầy đủ' }, { status: 400 });
    }

    if (newPassword.length < 6) {
        return NextResponse.json({ error: 'Mật khẩu mới tối thiểu 6 ký tự' }, { status: 400 });
    }

    const dbUser = await platformDb.user.findUnique({
        where: { id: user.userId },
        select: { passwordHash: true },
    });

    if (!dbUser) {
        return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const valid = await verifyPassword(oldPassword, dbUser.passwordHash);
    if (!valid) {
        return NextResponse.json({ error: 'Mật khẩu cũ không đúng' }, { status: 403 });
    }

    const newHash = await hashPassword(newPassword);
    await platformDb.user.update({
        where: { id: user.userId },
        data: { passwordHash: newHash },
    });

    return NextResponse.json({ ok: true, message: 'Đã đổi mật khẩu thành công' });
}
