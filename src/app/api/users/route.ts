import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);
    if (!workspaceId) {
        return NextResponse.json({ error: 'No workspace' }, { status: 404 });
    }

    const members = await platformDb.membership.findMany({
        where: { workspaceId },
        include: {
            user: {
                select: { id: true, email: true, name: true, phone: true, status: true },
            },
        },
    });

    return NextResponse.json({ members });
}

const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(2),
    role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const workspaceId = await resolveWorkspaceId(req, authResult.user);
        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace' }, { status: 404 });
        }

        const body = await req.json();
        const data = inviteSchema.parse(body);

        // Check if user exists
        let user = await platformDb.user.findUnique({
            where: { email: data.email },
        });

        const tempPassword = Math.random().toString(36).substring(2, 10);

        if (!user) {
            // Create new user
            user = await platformDb.user.create({
                data: {
                    email: data.email,
                    name: data.name,
                    passwordHash: await hashPassword(tempPassword),
                },
            });
        }

        // Check if already a member
        const existing = await platformDb.membership.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: user.id },
            },
        });
        if (existing) {
            return NextResponse.json(
                { error: 'Người dùng đã là thành viên' },
                { status: 409 }
            );
        }

        // Add membership
        const membership = await platformDb.membership.create({
            data: {
                workspaceId,
                userId: user.id,
                role: data.role,
            },
        });

        // Send invite email
        await sendEmail({
            to: data.email,
            subject: 'Bạn được mời tham gia workspace trên eMarketer Hub',
            html: `<p>Xin chào ${data.name},</p><p>Bạn đã được mời làm ${data.role}.</p><p>Đăng nhập tại: ${process.env.NEXT_PUBLIC_BASE_URL}/login</p><p>Mật khẩu tạm: <strong>${tempPassword}</strong></p>`,
        });

        return NextResponse.json({ membership });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        console.error('[USERS]', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
