import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import bcrypt from 'bcryptjs';
import { createCustomerToken, getCustomerCookieOptions } from '@/lib/smk/auth';

export async function POST(request: Request) {
    try {
        const { name, phone, password } = await request.json();

        if (!name || !phone || !password) {
            return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin' }, { status: 400 });
        }

        // L11: Server-side phone regex (matches client)
        const normalizedPhone = phone.replace(/\s/g, '').replace(/^84/, '0');
        if (!/^0\d{9}$/.test(normalizedPhone)) {
            return NextResponse.json({ error: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 0)' }, { status: 400 });
        }

        if (password.length < 6) {
            return NextResponse.json({ error: 'Mật khẩu phải có ít nhất 6 ký tự' }, { status: 400 });
        }

        // Phone already normalized above (L11)

        // Check if phone already exists
        const existing = await db.user.findUnique({ where: { phone: normalizedPhone } });
        if (existing) {
            return NextResponse.json({ error: 'Số điện thoại này đã được đăng ký' }, { status: 409 });
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await db.user.create({
            data: {
                name: name.trim(),
                phone: normalizedPhone,
                password: hashedPassword,
                role: 'CUSTOMER',
            },
        });

        // Create session
        const token = createCustomerToken({
            userId: user.id,
            name: user.name || '',
            phone: normalizedPhone,
            email: null,
            role: 'CUSTOMER',
        });

        const cookieOpts = getCustomerCookieOptions();
        const response = NextResponse.json({
            success: true,
            user: { id: user.id, name: user.name, phone: normalizedPhone },
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
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Lỗi server, vui lòng thử lại' }, { status: 500 });
    }
}
