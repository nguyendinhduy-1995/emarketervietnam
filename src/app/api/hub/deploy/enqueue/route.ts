import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/deploy/enqueue
 * 
 * After DNS verification → enqueue CRM instance deployment.
 * Creates CrmInstance record, updates order status, prepares deploy job.
 * 
 * Body: { workspaceId, domain }
 * Returns: { instanceId, status, message }
 * 
 * The actual deployment is handled by an external deployer script
 * that polls for PENDING instances or receives webhook notification.
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { workspaceId, domain } = body;

    if (!workspaceId || !domain) {
        return NextResponse.json({ error: 'workspaceId, domain required' }, { status: 400 });
    }

    // 1. Verify membership
    const membership = await db.membership.findFirst({
        where: { workspaceId, userId: session.userId },
    });
    if (!membership) {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    // 2. Verify DNS is verified
    const dnsRecord = await db.dnsVerification.findFirst({
        where: { workspaceId, domain, status: 'VERIFIED' },
    });
    if (!dnsRecord) {
        return NextResponse.json({
            error: 'Domain chưa được xác minh DNS',
            code: 'DNS_NOT_VERIFIED',
        }, { status: 400 });
    }

    // 3. Check if instance already exists
    const existing = await db.crmInstance.findUnique({ where: { workspaceId } });
    if (existing) {
        return NextResponse.json({
            error: `CRM instance đã tồn tại (status: ${existing.status})`,
            code: 'ALREADY_EXISTS',
            instance: {
                id: existing.id,
                domain: existing.domain,
                status: existing.status,
                crmUrl: existing.crmUrl,
            },
        }, { status: 409 });
    }

    // 4. Check entitlement for CRM
    const entitlement = await db.entitlement.findFirst({
        where: {
            workspaceId,
            moduleKey: 'CRM_CORE',
            status: 'ACTIVE',
        },
    });
    if (!entitlement) {
        return NextResponse.json({
            error: 'Chưa có quyền sử dụng CRM. Vui lòng mua gói CRM.',
            code: 'NOT_ENTITLED',
        }, { status: 403 });
    }

    // 5. Create CRM Instance record
    const dbName = `crm_${workspaceId.replace(/-/g, '_').slice(0, 20)}`;
    const instance = await db.crmInstance.create({
        data: {
            workspaceId,
            domain,
            dbName,
            adminUserId: session.userId,
            status: 'DEPLOYING',
            deployLog: { enqueuedAt: new Date().toISOString(), enqueuedBy: session.userId },
        },
    });

    // 6. Update entitlement meta with domain binding
    await db.entitlement.update({
        where: { id: entitlement.id },
        data: {
            meta: {
                ...(entitlement.meta as Record<string, unknown> || {}),
                boundDomain: domain,
                boundInstanceId: instance.id,
            },
        },
    });

    // 7. Log event
    await db.eventLog.create({
        data: {
            workspaceId,
            actorUserId: session.userId,
            type: 'CRM_DEPLOY_ENQUEUED',
            payloadJson: {
                instanceId: instance.id,
                domain,
                dbName,
            },
        },
    });

    // 8. Create notification for deployer (or webhook external system)
    await db.notificationQueue.create({
        data: {
            userId: session.userId,
            workspaceId,
            type: 'ENTITLEMENT_GRANTED',
            title: 'CRM đang được triển khai',
            body: `Hệ thống CRM tại ${domain} đang được triển khai. Bạn sẽ nhận được thông báo khi hoàn tất.`,
            referenceType: 'ORDER',
            referenceId: instance.id,
        },
    });

    return NextResponse.json({
        ok: true,
        instanceId: instance.id,
        domain,
        status: 'DEPLOYING',
        message: 'CRM instance đang được triển khai. Quá trình có thể mất 5-15 phút.',
    }, { status: 201 });
}
