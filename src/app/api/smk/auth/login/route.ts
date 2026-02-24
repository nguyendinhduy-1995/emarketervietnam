import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import bcrypt from 'bcryptjs';
import { createCustomerToken, getCustomerCookieOptions } from '@/lib/smk/auth';

export async function POST(request: Request) {
    try {
        const { phone, password } = await request.json();

        if (!phone || !password) {
            return NextResponse.json({ error: 'Vui lòng nhập SĐT và mật khẩu' }, { status: 400 });
        }

        const normalizedPhone = phone.replace(/\s/g, '').replace(/^84/, '0');

        const user = await db.user.findUnique({ where: { phone: normalizedPhone } });
        if (!user || !user.password) {
            return NextResponse.json({ error: 'SĐT hoặc mật khẩu không đúng' }, { status: 401 });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'SĐT hoặc mật khẩu không đúng' }, { status: 401 });
        }

        const token = createCustomerToken({
            userId: user.id,
            name: user.name || '',
            phone: normalizedPhone,
            email: user.email,
            role: user.role,
        });

        const cookieOpts = getCustomerCookieOptions();
        const response = NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, phone: normalizedPhone, email: user.email },
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
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại' }, { status: 500 });
    }
}
