import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { platformDb as prisma } from '@/lib/db/platform';
import { logEvent } from '@/lib/logEvent';

const rateLimit = new Map<string, { count: number; resetTime: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
        const now = Date.now();
        const record = rateLimit.get(ip);
        if (record && now < record.resetTime) {
            if (record.count >= MAX_ATTEMPTS) {
                return NextResponse.json({ error: 'Quá nhiều yêu cầu. Thử lại sau 15p.' }, { status: 429 });
            }
            record.count++;
        } else {
            rateLimit.set(ip, { count: 1, resetTime: now + WINDOW_MS });
        }

        const body = await req.json();
        const { contact } = body;

        if (!contact) {
            return NextResponse.json({ error: 'Vui lòng nhập email hoặc số điện thoại' }, { status: 400 });
        }

        const isEmail = contact.includes('@');
        let user = await prisma.user.findFirst({
            where: isEmail ? { email: contact } : { phone: contact }
        });

        // 2. Generate a secure crypto token
        const token = crypto.randomUUID();
        const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        if (!user) {
            // For Demo/Trial, if user doesn't exist, we can optionally create an empty shell user 
            // OR we can reject. The PRD says "có expiry, dùng cho trial/demo".
            // Let's create a shell user if it doesn't exist to allow passwordless signup logic.
            const tempEmail = isEmail ? contact : `temp-${Date.now()}@hub.local`;
            user = await prisma.user.create({
                data: {
                    email: tempEmail,
                    phone: isEmail ? null : contact,
                    name: "Người dùng mới",
                    passwordHash: "MAGIC_LINK_ONLY",
                    loginToken: token,
                    loginTokenExpiry: expiry
                }
            });

            await logEvent({ type: 'MAGIC_LINK_SIGNUP', actorUserId: user.id, payload: { contact } });
        } else {
            // User exists, update token
            await prisma.user.update({
                where: { id: user.id },
                data: { loginToken: token, loginTokenExpiry: expiry }
            });

            await logEvent({ type: 'MAGIC_LINK_REQUEST', actorUserId: user.id, payload: { contact } });
        }

        // 3. Simulated sending (In production, replace with Nodemailer or SMS Gateway)
        const magicLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login?token=${token}`;
        if (process.env.NODE_ENV === 'development') {
            console.log(`[MAGIC LINK FOR ${contact}]: \n\n${magicLink}\n\n`);
        }

        return NextResponse.json({
            message: 'Đã gửi liên kết đăng nhập. Kiểm tra console trong môi trường dev.',
            // Only expose token in dev for easy E2E testing
            developerToken: process.env.NODE_ENV === 'development' ? token : undefined
        });

    } catch (error) {
        console.error('Magic Link Error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
