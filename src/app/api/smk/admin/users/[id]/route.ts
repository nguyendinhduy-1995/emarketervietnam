import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import bcrypt from 'bcryptjs';
import { getSession, ADMIN_ROLES } from '@/lib/smk/auth';

// PATCH — update user
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền sửa user' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { name, email, password, role, permissions } = body;

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined && ADMIN_ROLES.includes(role)) updateData.role = role;
        if (permissions !== undefined) updateData.permissions = role === 'STAFF' ? permissions : null;
        if (password) updateData.password = await bcrypt.hash(password, 10);

        const user = await db.user.update({
            where: { id },
            data: updateData,
            select: {
                id: true, name: true, email: true, role: true, permissions: true, createdAt: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error) {
        console.error('Update user error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// DELETE — delete user
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Chỉ Admin mới có quyền xoá user' }, { status: 403 });
        }

        const { id } = await params;

        // Don't allow deleting yourself
        if (id === session.userId) {
            return NextResponse.json({ error: 'Không thể xoá chính bạn' }, { status: 400 });
        }

        await db.user.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
