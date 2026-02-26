import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';
import { signToken } from '@/lib/auth/jwt';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, phone, email, industry, landingSlug } = body;

        if (!name || (!phone && !email)) {
            return NextResponse.json({ error: 'Vui lòng nhập tên và số điện thoại hoặc email' }, { status: 400 });
        }

        const userPhone = phone || '';
        const userEmail = email || null;

        // Check if user already exists
        let user = await platformDb.user.findUnique({ where: { phone: userPhone } });
        let existingWorkspace = false;

        if (user) {
            // Check if already has a workspace
            const membership = await platformDb.membership.findFirst({
                where: { userId: user.id },
            });
            if (membership) existingWorkspace = true;
        }

        if (!user) {
            // Create user with a random password (they'll use magic link)
            const tempPassword = crypto.randomBytes(16).toString('hex');
            user = await platformDb.user.create({
                data: {
                    email: userEmail,
                    passwordHash: await hashPassword(tempPassword),
                    name,
                    phone: userPhone,
                },
            });
        }

        let workspaceId: string;

        if (!existingWorkspace) {
            // Create org + workspace
            const slug = `ws-${Date.now().toString(36)}`;
            const org = await platformDb.org.create({
                data: { name: `${name}'s Org`, ownerUserId: user.id },
            });
            const workspace = await platformDb.workspace.create({
                data: {
                    orgId: org.id,
                    name: `${name}'s Workspace`,
                    slug,
                    product: industry || 'SPA',
                },
            });
            workspaceId = workspace.id;

            // Create membership
            await platformDb.membership.create({
                data: { workspaceId, userId: user.id, role: 'OWNER' },
            });

            // Create trial subscription (14 days)
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + 14);
            await platformDb.subscription.create({
                data: {
                    workspaceId,
                    planKey: 'TRIAL',
                    status: 'TRIAL',
                    currentPeriodEnd: trialEnd,
                },
            });

            // Create EmkAccount for internal CRM tracking
            const source = landingSlug ? `LP_${landingSlug.toUpperCase().replace('-', '_')}` : 'DIRECT';

            await platformDb.emkAccount.create({
                data: {
                    workspaceId,
                    plan: 'TRIAL',
                    trialEndAt: trialEnd,
                },
            });

            // Log events
            await platformDb.eventLog.createMany({
                data: [
                    { workspaceId, actorUserId: user.id, type: 'USER_REGISTERED', payloadJson: { source, industry, name } },
                    { workspaceId, actorUserId: user.id, type: 'WORKSPACE_CREATED', payloadJson: { slug } },
                    { workspaceId, actorUserId: user.id, type: 'TRIAL_STARTED', payloadJson: { trialEnd: trialEnd.toISOString() } },
                ],
            });
        } else {
            const membership = await platformDb.membership.findFirst({
                where: { userId: user.id },
            });
            workspaceId = membership!.workspaceId;
        }

        // Generate login token (magic link)
        const loginToken = crypto.randomBytes(32).toString('hex');
        const loginTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min
        await platformDb.user.update({
            where: { id: user.id },
            data: { loginToken, loginTokenExpiry },
        });

        // Also generate JWT for immediate login
        const jwt = await signToken({
            userId: user.id,
            email: user.email || user.phone,
            name: user.name,
            isAdmin: user.isAdmin,
        });

        return NextResponse.json({
            workspaceId,
            loginLink: `/api/auth/token-login?token=${loginToken}`,
            jwt,
            isNew: !existingWorkspace,
        });

    } catch (error) {
        console.error('[HUB_SIGNUP]', error);
        return NextResponse.json({ error: 'Đã xảy ra lỗi, vui lòng thử lại' }, { status: 500 });
    }
}
