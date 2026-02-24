import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';
import crypto from 'crypto';

// GET — list user's download grants, or get signed download URL
export async function GET(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    const { searchParams } = new URL(req.url);
    const grantId = searchParams.get('grantId'); // if provided, generate download URL

    if (grantId) {
        // Generate signed download URL
        const grant = await db.downloadGrant.findUnique({
            where: { id: grantId },
            include: { asset: true },
        });

        if (!grant || grant.userId !== userId) {
            return NextResponse.json({ error: 'Không có quyền tải' }, { status: 403 });
        }

        if (grant.downloadCount >= grant.maxDownloads) {
            return NextResponse.json({ error: 'Đã hết lượt tải' }, { status: 400 });
        }

        if (grant.expiresAt && new Date(grant.expiresAt) < new Date()) {
            return NextResponse.json({ error: 'Link tải đã hết hạn' }, { status: 400 });
        }

        // Create download token (expires in 5 minutes)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 5 * 60 * 1000;
        const downloadUrl = `/api/hub/downloads/file?token=${token}&grantId=${grantId}&expires=${expiresAt}`;

        // Increment download count
        await db.downloadGrant.update({
            where: { id: grantId },
            data: { downloadCount: { increment: 1 } },
        });

        // Log download
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        const userAgent = req.headers.get('user-agent') || 'unknown';

        await db.downloadLog.create({
            data: { grantId, ip, userAgent },
        });

        return NextResponse.json({
            downloadUrl,
            filename: grant.asset.filename,
            expiresIn: '5 phút',
            downloadsRemaining: grant.maxDownloads - grant.downloadCount - 1,
        });
    }

    // List all grants for user
    const grants = await db.downloadGrant.findMany({
        where: { userId },
        include: {
            asset: { include: { product: { select: { name: true, icon: true } } } },
        },
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(grants);
}
