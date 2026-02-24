import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import bcrypt from 'bcryptjs';
import { createSessionToken, getSessionCookieOptions, ADMIN_ROLES, getEffectivePermissions, ALL_PERMISSIONS } from '@/lib/smk/auth';
import type { AdminRole, Permission } from '@/lib/smk/auth';

// Demo admin accounts for when DB is unavailable
const DEMO_ADMINS = [
    {
        email: 'admin@sieuthimatkinh.vn',
        password: 'admin123',
        name: 'Admin SMK',
        role: 'ADMIN' as AdminRole,
    },
];

export async function POST(request: Request) {
    try {
        const { email, password } = await request.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'Email và mật khẩu là bắt buộc' }, { status: 400 });
        }

        let userId = '';
        let userName = '';
        let userRole: AdminRole = 'ADMIN';
        let userPermissions: Permission[] = [];

        try {
            // Try DB login first
            const user = await db.user.findUnique({ where: { email } });

            if (!user || !user.password) {
                return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
            }

            if (!ADMIN_ROLES.includes(user.role as AdminRole)) {
                return NextResponse.json({ error: 'Tài khoản không có quyền truy cập admin' }, { status: 403 });
            }

            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
            }

            userId = user.id;
            userName = user.name || 'Admin';
            userRole = user.role as AdminRole;
            const rawPermissions = (user.permissions as string[] | null) || [];
            userPermissions = getEffectivePermissions(userRole, rawPermissions as Permission[]);
        } catch (dbError) {
            // DB unavailable — try demo login
            console.warn('DB unavailable, trying demo login:', dbError);
            const demo = DEMO_ADMINS.find((d) => d.email === email && d.password === password);
            if (!demo) {
                return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
            }
            userId = `demo_${Date.now()}`;
            userName = demo.name;
            userRole = demo.role;
            userPermissions = [...ALL_PERMISSIONS];
        }

        // Create session token
        const token = createSessionToken({
            userId,
            email,
            name: userName,
            role: userRole,
            permissions: userPermissions,
        });

        const cookieOpts = getSessionCookieOptions();
        const response = NextResponse.json({
            success: true,
            user: { name: userName, email, role: userRole, permissions: userPermissions },
        });

        response.cookies.set(cookieOpts.name, token, {
            maxAge: cookieOpts.maxAge,
            httpOnly: cookieOpts.httpOnly,
            sameSite: cookieOpts.sameSite,
            path: cookieOpts.path,
            secure: cookieOpts.secure,
        });

        return response;
    } catch (error) {
        console.error('Admin login error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
