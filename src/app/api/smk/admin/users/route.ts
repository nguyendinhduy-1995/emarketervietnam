import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import bcrypt from 'bcryptjs';
import { getSession, ADMIN_ROLES } from '@/lib/smk/auth';

// GET — list admin/staff users
export async function GET() {
    try {
        const session = await getSession();
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const users = await db.user.findMany({
            where: { role: { in: ['ADMIN', 'STORE_MANAGER', 'STAFF'] } },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                permissions: true,
                createdAt: true,
                updatedAt: true,
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// POST — create new admin/staff user (ADMIN only)
export async function POST(request: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền tạo user' }, { status: 403 });
        }

        const { name, email, password, role, permissions } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Tên, email và mật khẩu là bắt buộc' }, { status: 400 });
        }

        if (!ADMIN_ROLES.includes(role)) {
            return NextResponse.json({ error: 'Role không hợp lệ' }, { status: 400 });
        }

        // Check if email already exists
        const existing = await db.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 409 });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                permissions: role === 'STAFF' ? (permissions || []) : null,
            },
            select: {
                id: true, name: true, email: true, role: true, permissions: true, createdAt: true,
            },
        });

        return NextResponse.json({ user }, { status: 201 });
    } catch (error) {
        console.error('Create user error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
