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

    // Get workspace from order
    const membership = await db.membership.findFirst({
        where: { userId: session.userId },
        orderBy: { createdAt: 'asc' },
    });

    if (!membership) {
        return NextResponse.json({ error: 'Không tìm thấy workspace' }, { status: 404 });
    }

    const workspaceId = order.workspaceId || membership.workspaceId;

    // Get DNS verification
    const dnsVerification = await db.dnsVerification.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
    });

    // Get CRM instance
    const crmInstance = await db.crmInstance.findUnique({
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
