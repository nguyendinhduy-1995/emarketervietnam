import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';
import dns from 'dns/promises';
import { OrderStatus } from '@/lib/order-status';

/**
 * POST /api/hub/domain/verify/check
 * 
 * Performs DNS lookup to verify TXT + A records.
 * On success: updates order to DOMAIN_VERIFIED.
 * 
 * Body: { domain, workspaceId }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { domain, workspaceId } = await req.json();
    if (!domain || !workspaceId) {
        return NextResponse.json({ error: 'domain và workspaceId là bắt buộc' }, { status: 400 });
    }

    const normalizedDomain = domain.toLowerCase().trim()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '');

    // Get verification record
    const verification = await db.dnsVerification.findUnique({
        where: { workspaceId_domain: { workspaceId, domain: normalizedDomain } },
    });

    if (!verification) {
        return NextResponse.json({ error: 'Chưa khởi tạo xác minh domain' }, { status: 404 });
    }
    if (verification.status === 'VERIFIED') {
        return NextResponse.json({ ok: true, status: 'ALREADY_VERIFIED', message: 'Domain đã được xác minh.' });
    }
    if (verification.expiresAt && verification.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Token xác minh đã hết hạn. Vui lòng tạo lại.', code: 'EXPIRED' }, { status: 400 });
    }

    // Increment attempts
    await db.dnsVerification.update({
        where: { id: verification.id },
        data: { attempts: { increment: 1 } },
    });

    // ── Check TXT record ──
    const txtHost = `_emk-verify.${normalizedDomain}`;
    let txtMatch = false;
    try {
        const txtRecords = await dns.resolveTxt(txtHost);
        const flatRecords = txtRecords.map(chunks => chunks.join(''));
        txtMatch = flatRecords.includes(verification.verifyToken);
    } catch {
        // DNS lookup failed — record not found
    }

    // ── Check A record ──
    const serverIp = process.env.SERVER_IP || '76.13.190.139';
    let aMatch = false;
    try {
        const aRecords = await dns.resolve4(normalizedDomain);
        aMatch = aRecords.includes(serverIp);
    } catch {
        // DNS lookup failed
    }

    // Both must match
    if (!txtMatch || !aMatch) {
        const issues = [];
        if (!txtMatch) issues.push(`TXT record "${txtHost}" chưa đúng`);
        if (!aMatch) issues.push(`A record "${normalizedDomain}" chưa trỏ về ${serverIp}`);

        // Log attempt
        await db.eventLog.create({
            data: {
                workspaceId,
                actorUserId: session.userId,
                type: 'DOMAIN_VERIFY_FAILED',
                payloadJson: { domain: normalizedDomain, txtMatch, aMatch, issues, attempt: verification.attempts + 1 },
            },
        });

        return NextResponse.json({
            ok: false,
            status: 'FAILED',
            txtMatch,
            aMatch,
            issues,
            message: `Chưa xác minh được: ${issues.join('; ')}. DNS có thể mất 5-60 phút để cập nhật.`,
        });
    }

    // ── Both match → VERIFIED → Auto-deploy ──
    const dbName = `crm_${workspaceId.replace(/-/g, '_').slice(0, 20)}`;

    // Create or update CrmInstance
    let instance = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (!instance) {
        instance = await db.crmInstance.create({
            data: {
                workspaceId,
                domain: normalizedDomain,
                dbName,
                adminUserId: session.userId,
                status: 'DEPLOYING',
                deployLog: { enqueuedAt: new Date().toISOString(), enqueuedBy: session.userId, trigger: 'AUTO_DNS_VERIFY' },
            },
        });
    } else if (instance.status === 'PENDING' || instance.status === 'DNS_VERIFIED') {
        instance = await db.crmInstance.update({
            where: { id: instance.id },
            data: {
                status: 'DEPLOYING',
                domain: normalizedDomain,
                deployLog: {
                    ...(instance.deployLog as Record<string, unknown> || {}),
                    enqueuedAt: new Date().toISOString(),
                    trigger: 'AUTO_DNS_VERIFY',
                },
            },
        });
    }

    await db.$transaction([
        // Update DNS verification
        db.dnsVerification.update({
            where: { id: verification.id },
            data: { status: 'VERIFIED', verifiedAt: new Date() },
        }),

        // Skip DOMAIN_VERIFIED → go straight to DEPLOYING
        db.commerceOrder.updateMany({
            where: {
                workspaceId,
                status: OrderStatus.PAID_WAITING_DOMAIN_VERIFY,
            },
            data: { status: OrderStatus.DEPLOYING },
        }),

        // Bind entitlement to domain
        db.entitlement.updateMany({
            where: { workspaceId, moduleKey: 'CRM_CORE' },
            data: {
                meta: {
                    boundDomain: normalizedDomain,
                    boundInstanceId: instance.id,
                },
            },
        }),

        // Audit log
        db.eventLog.create({
            data: {
                workspaceId,
                actorUserId: session.userId,
                type: 'DOMAIN_VERIFIED_AUTO_DEPLOY',
                payloadJson: { domain: normalizedDomain, txtMatch, aMatch, instanceId: instance.id },
            },
        }),

        // Notification
        db.notificationQueue.create({
            data: {
                userId: session.userId,
                workspaceId,
                type: 'ENTITLEMENT_GRANTED',
                title: '✅ Domain xác minh + CRM đang triển khai!',
                body: `${normalizedDomain} đã xác minh. CRM đang được tự động triển khai — thường mất 5-15 phút.`,
                referenceType: 'DNS_VERIFICATION',
                referenceId: verification.id,
            },
        }),
    ]);

    // ── Fire-and-forget: trigger deployer on VPS ──
    const deployerUrl = process.env.DEPLOYER_URL || 'http://127.0.0.1:9876/deploy';
    const deploySecret = process.env.DEPLOY_CALLBACK_SECRET || 'deploy-secret-key';
    fetch(deployerUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${deploySecret}`,
        },
        body: JSON.stringify({
            domain: normalizedDomain,
            instanceId: instance.id,
            dbName: instance.dbName || dbName,
            workspaceId,
            adminEmail: session.email || `admin@${normalizedDomain}`,
        }),
    }).catch((err: Error) => {
        console.error('[AUTO-DEPLOY] Failed to trigger deployer:', err.message);
    });

    return NextResponse.json({
        ok: true,
        status: 'VERIFIED',
        deploying: true,
        domain: normalizedDomain,
        instanceId: instance.id,
        message: 'Domain xác minh thành công! CRM đang được tự động triển khai.',
    });
}
