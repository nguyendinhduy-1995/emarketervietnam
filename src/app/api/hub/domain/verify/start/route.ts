import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';
import crypto from 'crypto';

/**
 * POST /api/hub/domain/verify/start
 * 
 * Initiates domain verification for a CRM deployment.
 * Creates TXT record instructions and stores verification token.
 * 
 * Body: { orderId, domain }
 * Response: { txtRecord, aRecord, token, expiresAt }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { orderId, domain } = await req.json();
    if (!orderId || !domain) {
        return NextResponse.json({ error: 'orderId và domain là bắt buộc' }, { status: 400 });
    }

    // Normalize domain
    const normalizedDomain = domain.toLowerCase().trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

    // Get order and workspace
    const order = await db.commerceOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order || order.userId !== session.userId) {
        return NextResponse.json({ error: 'Order không tồn tại' }, { status: 404 });
    }
    if (!order.workspaceId) {
        return NextResponse.json({ error: 'Order chưa gắn workspace' }, { status: 400 });
    }

    // Generate verification token (TTL 72h)
    const verifyToken = `emk-verify-${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 72 * 3600_000); // 72h

    // TXT record: _emk-verify.{domain} = {token}
    const txtHost = `_emk-verify.${normalizedDomain}`;
    // A record: {domain} → server IP
    const serverIp = process.env.SERVER_IP || '76.13.190.139';

    // Upsert DNS verification record
    await db.dnsVerification.upsert({
        where: {
            workspaceId_domain: {
                workspaceId: order.workspaceId,
                domain: normalizedDomain,
            },
        },
        create: {
            workspaceId: order.workspaceId,
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

    // Log audit
    await db.eventLog.create({
        data: {
            workspaceId: order.workspaceId,
            actorUserId: session.userId,
            type: 'DOMAIN_VERIFY_START',
            payloadJson: {
                orderId, domain: normalizedDomain,
                tokenPrefix: verifyToken.slice(0, 20) + '...',
            },
        },
    });

    return NextResponse.json({
        ok: true,
        domain: normalizedDomain,
        instructions: {
            txt: {
                host: txtHost,
                value: verifyToken,
                description: `Thêm TXT record vào DNS: ${txtHost} → ${verifyToken}`,
            },
            a: {
                host: normalizedDomain,
                value: serverIp,
                description: `Trỏ A record: ${normalizedDomain} → ${serverIp}`,
            },
        },
        expiresAt: expiresAt.toISOString(),
        message: 'Hãy cấu hình DNS rồi bấm "Kiểm tra" khi xong.',
    });
}
