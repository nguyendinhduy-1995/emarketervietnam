import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformDb } from '@/lib/db/platform';
import { verifyPassword } from '@/lib/auth/password';
import { signToken, setSessionCookie } from '@/lib/auth/jwt';

const loginSchema = z.object({
    phone: z.string().min(9).max(15),
    password: z.string().min(1),
});

// Simple in-memory rate limiting (Replace with Redis in production)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 50;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const ip = req.headers.get('x-forwarded-for') || 'unknown';
        const now = Date.now();
        const attempts = loginAttempts.get(ip);

        if (attempts && attempts.count >= MAX_ATTEMPTS && now < attempts.resetAt) {
            return NextResponse.json(
                { error: 'Quá nhiều lần thử. Vui lòng đợi 15 phút.' },
                { status: 429 }
            );
        }

        const body = await req.json();

        // Magic Link Token Login (keep backward compatible)
        if (body.token) {
            const tokenUser = await platformDb.user.findFirst({
                where: { loginToken: body.token }
            });
            if (!tokenUser || !tokenUser.loginTokenExpiry || tokenUser.loginTokenExpiry < new Date()) {
                return NextResponse.json({ error: 'Liên kết đã hết hạn' }, { status: 401 });
            }
            await platformDb.user.update({
                where: { id: tokenUser.id },
                data: { loginToken: null, loginTokenExpiry: null }
            });
            const token = await signToken({
                userId: tokenUser.id, email: tokenUser.email || tokenUser.phone,
                name: tokenUser.name, isAdmin: tokenUser.isAdmin,
            });
            await setSessionCookie(token);
            return NextResponse.json({ user: { id: tokenUser.id, phone: tokenUser.phone, name: tokenUser.name, isAdmin: tokenUser.isAdmin } });
        }

        const data = loginSchema.parse(body);

        // Normalize phone (remove spaces, dashes)
        const normalizedPhone = data.phone.replace(/[\s\-]/g, '');

        // Find user by phone
        const user = await platformDb.user.findUnique({
            where: { phone: normalizedPhone },
        });

        if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
            const current = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
            current.count++;
            loginAttempts.set(ip, current);

            return NextResponse.json(
                { error: 'Số điện thoại hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        if (user.status === 'DISABLED') {
            return NextResponse.json(
                { error: 'Tài khoản đã bị vô hiệu hóa' },
                { status: 403 }
            );
        }

        loginAttempts.delete(ip);

        const token = await signToken({
            userId: user.id,
            email: user.email || user.phone,
            name: user.name,
            isAdmin: user.isAdmin,
        });

        await setSessionCookie(token);

        return NextResponse.json({
            user: {
                id: user.id,
                phone: user.phone,
                email: user.email,
                name: user.name,
                isAdmin: user.isAdmin,
            },
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dữ liệu không hợp lệ' },
                { status: 400 }
            );
        }
        console.error('[LOGIN]', error);
        return NextResponse.json(
            { error: 'Lỗi hệ thống' },
            { status: 500 }
        );
    }
}
