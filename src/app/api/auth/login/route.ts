import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformDb } from '@/lib/db/platform';
import { verifyPassword } from '@/lib/auth/password';
import { signToken, setSessionCookie } from '@/lib/auth/jwt';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

// Simple rate limiting in memory (per-IP)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
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
        const data = loginSchema.parse(body);

        // Find user
        const user = await platformDb.user.findUnique({
            where: { email: data.email },
        });

        if (!user || !(await verifyPassword(data.password, user.passwordHash))) {
            // Track failed attempts
            const current = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
            current.count++;
            loginAttempts.set(ip, current);

            return NextResponse.json(
                { error: 'Email hoặc mật khẩu không đúng' },
                { status: 401 }
            );
        }

        if (user.status === 'DISABLED') {
            return NextResponse.json(
                { error: 'Tài khoản đã bị vô hiệu hóa' },
                { status: 403 }
            );
        }

        // Clear rate limit on success
        loginAttempts.delete(ip);

        // Generate JWT
        const token = await signToken({
            userId: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
        });

        await setSessionCookie(token);

        return NextResponse.json({
            user: {
                id: user.id,
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
