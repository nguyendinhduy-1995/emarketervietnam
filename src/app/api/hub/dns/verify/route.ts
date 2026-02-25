import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';
import dns from 'dns/promises';

/**
 * POST /api/hub/dns/verify
 * 
 * User clicks "Xác minh" → Hub checks DNS TXT record for verification token.
 * 
 * Body: { verificationId }
 * Returns: { verified, domain, status }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { verificationId } = body;

    if (!verificationId) {
        return NextResponse.json({ error: 'verificationId required' }, { status: 400 });
    }

    // Find the verification record
    const verification = await db.dnsVerification.findUnique({
        where: { id: verificationId },
    });

    if (!verification) {
        return NextResponse.json({ error: 'Verification không tồn tại' }, { status: 404 });
    }

    // Check ownership
    const membership = await db.membership.findFirst({
        where: { workspaceId: verification.workspaceId, userId: session.userId },
    });
    if (!membership) {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    // Check expiry
    if (verification.expiresAt && verification.expiresAt < new Date()) {
        await db.dnsVerification.update({
            where: { id: verificationId },
            data: { status: 'EXPIRED' },
        });
        return NextResponse.json({
            verified: false,
            status: 'EXPIRED',
            error: 'Token đã hết hạn. Vui lòng tạo lại.',
        }, { status: 410 });
    }

    // Already verified?
    if (verification.status === 'VERIFIED') {
        return NextResponse.json({
            verified: true,
            status: 'VERIFIED',
            domain: verification.domain,
            verifiedAt: verification.verifiedAt,
        });
    }

    // Perform DNS TXT lookup
    const txtHost = `_emk-verify.${verification.domain}`;
    let txtRecords: string[][] = [];

    try {
        txtRecords = await dns.resolveTxt(txtHost);
    } catch (err) {
        // DNS lookup failed — domain likely doesn't have the TXT record yet
        await db.dnsVerification.update({
            where: { id: verificationId },
            data: { attempts: { increment: 1 }, lastCheckedAt: new Date() },
        });

        return NextResponse.json({
            verified: false,
            status: 'PENDING',
            error: `Không tìm thấy TXT record tại ${txtHost}. DNS có thể chưa propagate (chờ 5-30 phút).`,
            attempts: verification.attempts + 1,
        });
    }

    // Check if any TXT record matches our token
    const flatRecords = txtRecords.map(r => r.join('')); // TXT records can be split
    const found = flatRecords.includes(verification.verifyToken);

    if (!found) {
        await db.dnsVerification.update({
            where: { id: verificationId },
            data: { attempts: { increment: 1 }, lastCheckedAt: new Date() },
        });

        return NextResponse.json({
            verified: false,
            status: 'PENDING',
            error: `TXT record tại ${txtHost} không khớp. Giá trị cần: ${verification.verifyToken}`,
            foundRecords: flatRecords,
            attempts: verification.attempts + 1,
        });
    }

    // ✅ Verified!
    await db.dnsVerification.update({
        where: { id: verificationId },
        data: {
            status: 'VERIFIED',
            verifiedAt: new Date(),
            lastCheckedAt: new Date(),
            attempts: { increment: 1 },
        },
    });

    // Log event
    await db.eventLog.create({
        data: {
            workspaceId: verification.workspaceId,
            actorUserId: session.userId,
            type: 'DNS_VERIFIED',
            payloadJson: { domain: verification.domain, verificationId },
        },
    });

    return NextResponse.json({
        verified: true,
        status: 'VERIFIED',
        domain: verification.domain,
        message: `Domain ${verification.domain} đã được xác minh thành công!`,
    });
}
