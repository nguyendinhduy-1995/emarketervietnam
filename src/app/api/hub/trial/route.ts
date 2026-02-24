import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { getAnySession } from '@/lib/auth/jwt';

// POST /api/hub/trial — Create 14-day free trial for PROVISION_TENANT products
export async function POST(req: NextRequest) {
    const session = await getAnySession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    const { productId, shopName } = await req.json();
    if (!productId || !shopName?.trim()) {
        return NextResponse.json({ error: 'productId và tên cửa hàng là bắt buộc' }, { status: 400 });
    }

    // Validate product
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || product.deliveryMethod !== 'PROVISION_TENANT') {
        return NextResponse.json({ error: 'Sản phẩm không hỗ trợ dùng thử' }, { status: 400 });
    }

    // Check if user already has a trial for this product
    const existingTrial = await db.emkAccount.findFirst({
        where: {
            workspace: { org: { ownerUserId: userId } },
            plan: 'TRIAL',
            status: 'ACTIVE',
        },
        include: { workspace: true },
    });
    if (existingTrial) {
        return NextResponse.json({
            error: 'Bạn đã có bản dùng thử đang hoạt động',
            existingSlug: existingTrial.workspace.slug,
            redirectUrl: `/smk-crm`,
        }, { status: 409 });
    }

    // Generate slug from shop name
    const rawSlug = shopName.trim()
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove Vietnamese diacritics
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40);
    const slug = `${rawSlug}-${Date.now().toString(36)}`;

    // Check slug uniqueness
    const existingWs = await db.workspace.findUnique({ where: { slug } });
    if (existingWs) {
        return NextResponse.json({ error: 'Slug đã tồn tại, vui lòng thử tên khác' }, { status: 409 });
    }

    const trialEndAt = new Date(Date.now() + 14 * 86400000); // 14 days

    // Provision in transaction
    const result = await db.$transaction(async (tx) => {
        // 1. Create Org
        const org = await tx.org.create({
            data: {
                name: shopName.trim(),
                ownerUserId: userId,
                status: 'ACTIVE',
            },
        });

        // 2. Create Workspace
        const workspace = await tx.workspace.create({
            data: {
                orgId: org.id,
                name: shopName.trim(),
                slug,
                product: 'OPTICAL',
                status: 'ACTIVE',
            },
        });

        // 3. Create Membership (ADMIN)
        await tx.membership.create({
            data: { workspaceId: workspace.id, userId, role: 'ADMIN' },
        });

        // 4. Create EmkAccount (TRIAL — full features)
        const account = await tx.emkAccount.create({
            data: {
                workspaceId: workspace.id,
                plan: 'TRIAL',
                status: 'ACTIVE',
                trialEndAt,
            },
        });

        // 5. Create Entitlement (full access during trial)
        await tx.entitlement.create({
            data: {
                workspaceId: workspace.id,
                userId,
                productId,
                moduleKey: product.key,
                scope: 'TENANT',
                status: 'ACTIVE',
                meta: { trial: true, trialEndAt: trialEndAt.toISOString() },
            },
        });

        // 6. Subscription (TRIAL status)
        await tx.subscription.create({
            data: {
                workspaceId: workspace.id,
                userId,
                productId,
                planKey: product.key,
                status: 'TRIAL',
                trialEndsAt: trialEndAt,
                currentPeriodEnd: trialEndAt,
            },
        });

        // 7. Notification
        await tx.notificationQueue.create({
            data: {
                userId,
                type: 'TRIAL_STARTED',
                title: `🎉 Dùng thử "${shopName.trim()}" đã bắt đầu!`,
                body: `Bạn có 14 ngày để trải nghiệm đầy đủ tính năng CRM. Hết hạn: ${trialEndAt.toLocaleDateString('vi-VN')}.`,
                referenceType: 'WORKSPACE',
                referenceId: workspace.id,
            },
        });

        // 8. Log
        await tx.eventLog.create({
            data: {
                actorUserId: userId,
                type: 'TRIAL_PROVISIONED',
                workspaceId: workspace.id,
                payloadJson: {
                    shopName: shopName.trim(),
                    slug,
                    productId,
                    trialEndAt: trialEndAt.toISOString(),
                },
            },
        });

        return { org, workspace, account };
    });

    return NextResponse.json({
        ok: true,
        message: `Tạo dùng thử "${shopName.trim()}" thành công! Hết hạn: ${trialEndAt.toLocaleDateString('vi-VN')}`,
        workspace: { id: result.workspace.id, slug: result.workspace.slug, name: result.workspace.name },
        trialEndAt: trialEndAt.toISOString(),
        redirectUrl: `/smk-crm`,
    }, { status: 201 });
}
