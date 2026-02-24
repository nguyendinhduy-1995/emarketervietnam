import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformDb } from '@/lib/db/platform';
import { verifyPassword } from '@/lib/auth/password';
import { signToken, setCrmSessionCookie } from '@/lib/auth/jwt';

const loginSchema = z.object({
    phone: z.string().min(9).max(15),
    password: z.string().min(1),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = loginSchema.parse(body);

        const normalizedPhone = data.phone.replace(/[\s\-]/g, '');

        const user = await platformDb.user.findUnique({
            where: { phone: normalizedPhone },
        });

        if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
            return NextResponse.json(
                { error: 'Số điện thoại hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        // CRM requires isAdmin or emkRole
        if (!user.isAdmin && !user.emkRole) {
            return NextResponse.json(
                { error: 'Tài khoản không có quyền truy cập CRM. Vui lòng liên hệ quản trị viên.' },
                { status: 403 }
            );
        }

        if (user.status === 'DISABLED') {
            return NextResponse.json(
                { error: 'Tài khoản đã bị vô hiệu hóa' },
                { status: 403 }
            );
        }

        const token = await signToken({
            userId: user.id,
            email: user.email || user.phone,
            name: user.name,
            isAdmin: user.isAdmin,
        });

        await setCrmSessionCookie(token);

        return NextResponse.json({
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                name: user.name,
                isAdmin: user.isAdmin,
                emkRole: user.emkRole,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ' }, { status: 400 });
        }
        console.error('[CRM_LOGIN]', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
