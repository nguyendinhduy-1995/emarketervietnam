import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { requirePlatformAdmin } from '@/lib/auth/emk-guard';
import { logAdminAction } from '@/lib/audit';

// POST /api/hub/provision — Create new tenant (Org + Workspace + Admin user)
export async function POST(req: NextRequest) {
    const auth = await requirePlatformAdmin(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { orgName, workspaceName, slug, product, adminUserId, plan } = body;

    if (!orgName || !slug || !adminUserId) {
        return NextResponse.json({
            error: 'orgName, slug, adminUserId là bắt buộc',
        }, { status: 400 });
    }

    // Check slug uniqueness
    const existing = await platformDb.workspace.findUnique({ where: { slug } });
    if (existing) {
        return NextResponse.json({ error: `Slug "${slug}" đã được sử dụng` }, { status: 409 });
    }

    // Check admin user exists
    const adminUser = await platformDb.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser) {
        return NextResponse.json({ error: 'Admin user không tồn tại' }, { status: 404 });
    }

    // Create in transaction
    const result = await platformDb.$transaction(async (tx) => {
        // 1. Create Org
        const org = await tx.org.create({
            data: {
                name: orgName,
                ownerUserId: adminUserId,
                status: 'ACTIVE',
            },
        });

        // 2. Create Workspace
        const workspace = await tx.workspace.create({
            data: {
                orgId: org.id,
                name: workspaceName || orgName,
                slug,
                product: product || 'SPA',
                status: 'ACTIVE',
            },
        });

        // 3. Create Membership (ADMIN role)
        const membership = await tx.membership.create({
            data: {
                workspaceId: workspace.id,
                userId: adminUserId,
                role: 'ADMIN',
            },
        });

        // 4. Create EmkAccount (CRM account)
        const account = await tx.emkAccount.create({
            data: {
                workspaceId: workspace.id,
                plan: plan || 'TRIAL',
                status: 'ACTIVE',
                trialEndAt: new Date(Date.now() + 14 * 86400000), // 14 days
            },
        });

        // 5. Create Wallet
        const wallet = await tx.wallet.create({
            data: {
                userId: adminUserId,
                balanceAvailable: 0,
                currency: 'VND',
            },
        });

        // 6. Create default Subscription
        const subscription = await tx.subscription.create({
            data: {
                workspaceId: workspace.id,
                userId: adminUserId,
                planKey: plan || 'TRIAL',
                status: 'TRIAL',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(Date.now() + 14 * 86400000),
            },
        });

        // 7. Log provisioning
        await tx.eventLog.create({
            data: {
                actorUserId: auth.user.userId,
                type: 'TENANT_PROVISIONED',
                workspaceId: workspace.id,
                payloadJson: {
                    orgId: org.id,
                    workspaceId: workspace.id,
                    slug,
                    adminUserId,
                    plan: plan || 'TRIAL',
                },
            },
        });

        return { org, workspace, membership, account, wallet, subscription };
    });

    // Audit
    await logAdminAction({
        actorUserId: auth.user.userId,
        actorName: auth.user.name,
        action: 'TENANT_PROVISIONED',
        resource: 'Workspace',
        resourceId: result.workspace.id,
        after: {
            orgId: result.org.id,
            workspaceId: result.workspace.id,
            slug,
            adminUserId,
        },
        reason: `Provisioned new tenant: ${orgName}`,
    });

    return NextResponse.json({
        ok: true,
        org: { id: result.org.id, name: orgName },
        workspace: { id: result.workspace.id, slug },
        membership: { id: result.membership.id, role: 'ADMIN' },
        subscription: { id: result.subscription.id, plan: plan || 'TRIAL' },
    }, { status: 201 });
}
