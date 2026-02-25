import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/hub/addons/trial
 * 
 * CRM instance requests a 7-day trial for an add-on feature.
 * Creates a trial entitlement with activeTo = now + 7 days.
 * 
 * Body: { featureKey, workspaceId }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const { featureKey, workspaceId } = await req.json();
    if (!featureKey || !workspaceId) {
        return NextResponse.json({ error: 'featureKey, workspaceId required' }, { status: 400 });
    }

    // Verify membership
    const membership = await db.membership.findFirst({
        where: { workspaceId, userId: session.userId },
    });
    if (!membership) {
        return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    // Check if already has active entitlement
    const existing = await db.entitlement.findFirst({
        where: {
            workspaceId, moduleKey: featureKey, status: 'ACTIVE',
            OR: [{ activeTo: null }, { activeTo: { gt: new Date() } }],
        },
    });
    if (existing) {
        return NextResponse.json({ error: 'Tính năng đã được kích hoạt' }, { status: 409 });
    }

    // Check if already trialed
    const trialUsed = await db.entitlement.findFirst({
        where: {
            workspaceId, moduleKey: featureKey,
            meta: { path: ['isTrial'], equals: true },
        },
    });
    if (trialUsed) {
        return NextResponse.json({
            error: 'Đã sử dụng trial cho tính năng này. Vui lòng mua để tiếp tục.',
            code: 'TRIAL_USED',
            purchaseUrl: `/hub/marketplace?addon=${featureKey}`,
        }, { status: 409 });
    }

    // Create trial entitlement
    const trialEnd = new Date(Date.now() + 7 * 86400_000); // 7 days
    const entitlement = await db.entitlement.create({
        data: {
            workspaceId, userId: session.userId,
            moduleKey: featureKey, scope: 'TENANT',
            status: 'ACTIVE', activeFrom: new Date(), activeTo: trialEnd,
            meta: { isTrial: true, trialDays: 7 },
        },
    });

    // Log
    await db.eventLog.create({
        data: {
            actorUserId: session.userId, workspaceId,
            type: 'ADDON_TRIAL_STARTED',
            payloadJson: { featureKey, entitlementId: entitlement.id, trialEnd: trialEnd.toISOString() },
        },
    });

    // Notify
    await db.notificationQueue.create({
        data: {
            userId: session.userId, workspaceId,
            type: 'ENTITLEMENT_GRANTED',
            title: `🎁 Trial ${featureKey} đã bắt đầu`,
            body: `Bạn có 7 ngày dùng thử. Trial kết thúc: ${trialEnd.toLocaleDateString('vi-VN')}.`,
            referenceType: 'ENTITLEMENT', referenceId: entitlement.id,
        },
    });

    return NextResponse.json({
        ok: true, entitlementId: entitlement.id,
        featureKey, trialEnd: trialEnd.toISOString(),
        message: `Trial 7 ngày cho ${featureKey} đã được kích hoạt!`,
    }, { status: 201 });
}
