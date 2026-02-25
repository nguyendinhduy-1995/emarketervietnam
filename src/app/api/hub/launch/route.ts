import { NextRequest, NextResponse } from 'next/server';
import { getAnySession } from '@/lib/auth/jwt';
import { platformDb as db } from '@/lib/db/platform';
import { signLaunchToken } from '@/lib/auth/launch-token';
import { getWorkspaceEntitlements, resolveUserWorkspace } from '@/lib/auth/entitlement-guard';

/**
 * POST /api/hub/launch
 * 
 * User clicks "Mở App" → Hub creates launchToken → returns launchUrl.
 * 
 * Body: { appKey, workspaceId? }
 * Returns: { launchUrl, token, expiresIn: 60 }
 */
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const body = await req.json();
    const { appKey, workspaceId: requestedWsId } = body;

    if (!appKey) {
        return NextResponse.json({ error: 'appKey required' }, { status: 400 });
    }

    // 1. Resolve workspace
    const workspaceId = requestedWsId || await resolveUserWorkspace(session.userId);
    if (!workspaceId) {
        return NextResponse.json({ error: 'Không tìm thấy workspace', code: 'NO_WORKSPACE' }, { status: 404 });
    }

    // 2. Verify user membership
    const membership = await db.membership.findFirst({
        where: { workspaceId, userId: session.userId },
    });
    if (!membership) {
        return NextResponse.json({ error: 'Không có quyền truy cập workspace này', code: 'NO_MEMBERSHIP' }, { status: 403 });
    }

    // 3. Check entitlement for this app
    const entitlements = await getWorkspaceEntitlements(workspaceId);
    const entitledKeys = entitlements.map(e => e.moduleKey);
    const hasAppEntitlement = entitledKeys.includes(appKey) || entitledKeys.includes(`${appKey}_CORE`);

    if (!hasAppEntitlement) {
        return NextResponse.json({
            error: 'Chưa kích hoạt ứng dụng này',
            code: 'NOT_ENTITLED',
            upgradeUrl: '/hub/marketplace',
        }, { status: 403 });
    }

    // 4. Get app base URL
    const product = await db.product.findFirst({
        where: {
            OR: [
                { key: appKey },
                { key: `${appKey}_CORE` },
            ],
            status: 'PUBLISHED',
        },
        select: { metadata: true, key: true },
    });

    // Determine launch URL from product metadata or convention
    const metadata = product?.metadata as Record<string, unknown> | null;
    const appBaseUrl = (metadata?.launchUrl as string) ||
        `https://${appKey.toLowerCase()}.emarketervietnam.vn`;

    // 5. Sign launch token
    const token = await signLaunchToken({
        userId: session.userId,
        userName: session.name,
        email: session.email,
        workspaceId,
        appKey,
        entitlements: entitledKeys,
    });

    const launchUrl = `${appBaseUrl}?launch=${encodeURIComponent(token)}`;

    // 6. Log launch event
    await db.eventLog.create({
        data: {
            actorUserId: session.userId,
            workspaceId,
            type: 'APP_LAUNCHED',
            payloadJson: { appKey, launchUrl: appBaseUrl },
        },
    });

    return NextResponse.json({
        launchUrl,
        token,
        expiresIn: 60, // seconds
        appKey,
        workspaceId,
    });
}
