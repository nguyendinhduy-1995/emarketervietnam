import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

// GET /api/hub/setup/[orderId] — Get setup data for CRM provisioning wizard
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string }> }
) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { orderId } = await params;

    const order = await db.commerceOrder.findUnique({
        where: { id: orderId },
        include: { items: true },
    });

    if (!order || order.userId !== session.userId) {
        return NextResponse.json({ error: 'Không tìm thấy đơn hàng' }, { status: 404 });
    }

    // Get or auto-create workspace for user
    let membership = await db.membership.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
        // Auto-create Org → Workspace → Membership for first-time buyers
        const user = await db.user.findUnique({ where: { id: session.userId } });
        const displayName = user?.name || 'My Business';

        const org = await db.org.create({
            data: {
                name: displayName,
                ownerUserId: session.userId,
            },
        });
        const workspace = await db.workspace.create({
            data: {
                name: `${displayName} Workspace`,
                slug: `ws-${session.userId.slice(-8)}-${Date.now().toString(36)}`,
                orgId: org.id,
            },
        });
        membership = await db.membership.create({
            data: {
                userId: session.userId,
                workspaceId: workspace.id,
                role: 'OWNER',
            },
        });

        // Also update the order with workspaceId
        await db.commerceOrder.update({
            where: { id: orderId },
            data: { workspaceId: workspace.id },
        });
    }

    const workspaceId = order.workspaceId || membership.workspaceId;

    // Update order workspaceId if missing
    if (!order.workspaceId && workspaceId) {
        await db.commerceOrder.update({
            where: { id: orderId },
            data: { workspaceId },
        });
    }

    // Get DNS verification
    const dnsVerification = await db.dnsVerification.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
    });

    // Get CRM instance
    const crmInstance = await db.crmInstance.findFirst({
        where: { workspaceId },
    });

    return NextResponse.json({
        order: {
            id: order.id,
            status: order.status,
            totalAmount: order.totalAmount,
            note: order.note,
            createdAt: order.createdAt,
        },
        workspaceId,
        dnsVerification: dnsVerification ? {
            id: dnsVerification.id,
            domain: dnsVerification.domain,
            verifyToken: dnsVerification.verifyToken,
            status: dnsVerification.status,
            txtRecord: `_emk-verify.${dnsVerification.domain}`,
            expiresAt: dnsVerification.expiresAt?.toISOString(),
        } : null,
        crmInstance: crmInstance ? {
            id: crmInstance.id,
            domain: crmInstance.domain,
            status: crmInstance.status,
            crmUrl: crmInstance.crmUrl,
        } : null,
    });
}
