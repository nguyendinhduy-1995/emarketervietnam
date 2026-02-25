import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';
import crypto from 'crypto';

/**
 * POST /api/hub/dns/init
 * 
 * User submits their custom domain → Hub creates a DNS verification token
 * and returns instructions to add a TXT record.
 * 
 * Body: { domain, workspaceId? }
 * Returns: { verificationId, domain, txtRecord, txtValue, expiresAt }
 * 
 * User then creates: TXT _emk-verify.<domain> = <token>
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { domain } = body;

    if (!domain) {
        return NextResponse.json({ error: 'domain required' }, { status: 400 });
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Resolve workspace
    const membership = await db.membership.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
    });
    if (!membership) {
        return NextResponse.json({ error: 'Không tìm thấy workspace' }, { status: 404 });
    }
    const workspaceId = membership.workspaceId;

    // Check if domain already claimed by another workspace
    const existingClaim = await db.dnsVerification.findFirst({
        where: { domain: normalizedDomain, status: 'VERIFIED' },
    });
    if (existingClaim && existingClaim.workspaceId !== workspaceId) {
        return NextResponse.json({
            error: 'Domain này đã được xác minh bởi tài khoản khác',
            code: 'DOMAIN_CLAIMED',
        }, { status: 409 });
    }

    // Generate verification token
    const verifyToken = `emk-verify-${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 72 * 3600_000); // 72h to verify

    // Upsert verification record
    const verification = await db.dnsVerification.upsert({
        where: {
            workspaceId_domain: { workspaceId, domain: normalizedDomain },
        },
        create: {
            workspaceId,
            domain: normalizedDomain,
            verifyToken,
            status: 'PENDING',
            expiresAt,
        },
        update: {
            verifyToken,
            status: 'PENDING',
            attempts: 0,
            expiresAt,
            verifiedAt: null,
        },
    });

    // Log event
    await db.eventLog.create({
        data: {
            workspaceId,
            actorUserId: session.userId,
            type: 'DNS_VERIFICATION_INITIATED',
            payloadJson: { domain: normalizedDomain, verificationId: verification.id },
        },
    });

    return NextResponse.json({
        verificationId: verification.id,
        domain: normalizedDomain,
        txtRecord: `_emk-verify.${normalizedDomain}`,
        txtValue: verifyToken,
        expiresAt: expiresAt.toISOString(),
        instructions: [
            `1. Đăng nhập vào nhà cung cấp DNS của bạn (Cloudflare, GoDaddy, v.v.)`,
            `2. Thêm TXT record:`,
            `   Tên: _emk-verify.${normalizedDomain}`,
            `   Giá trị: ${verifyToken}`,
            `3. Thêm A record (hoặc CNAME):`,
            `   Tên: ${normalizedDomain}`,
            `   Giá trị: ${process.env.CRM_SERVER_IP || '(IP server sẽ được cấp)'}`,
            `4. Quay lại đây và bấm "Xác minh" sau khi DNS đã propagate (thường 5-30 phút)`,
        ],
    });
}
