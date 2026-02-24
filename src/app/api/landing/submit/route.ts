import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';
import { logEvent } from '@/lib/logEvent';
import { slugify } from '@/lib/slug';
import crypto from 'crypto';

// Rate limiting
const submissions = new Map<string, { count: number; resetAt: number }>();
const MAX = 5;
const WINDOW = 15 * 60 * 1000;

export async function POST(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const rec = submissions.get(ip);
    if (rec && now < rec.resetAt) {
        if (rec.count >= MAX) return NextResponse.json({ error: 'Quá nhiều yêu cầu' }, { status: 429 });
        rec.count++;
    } else {
        submissions.set(ip, { count: 1, resetAt: now + WINDOW });
    }

    try {
        const body = await req.json();
        const { name, phone, industry, _hp, landingSlug, utmSource, utmCampaign, utmMedium } = body;

        // Honeypot check
        if (_hp) return NextResponse.json({ error: 'Spam detected' }, { status: 400 });

        if (!name || !phone) {
            return NextResponse.json({ error: 'Vui lòng nhập tên và số điện thoại' }, { status: 400 });
        }

        // Create email from phone
        const email = `user-${phone.replace(/\D/g, '')}@hub.local`;
        const slug = slugify(name + '-' + Date.now().toString(36));
        const token = crypto.randomUUID();
        const expiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min
        const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

        // Check if user already exists
        let user = await platformDb.user.findFirst({ where: { phone } });
        let workspaceId: string | null = null;

        if (!user) {
            user = await platformDb.user.create({
                data: {
                    email, phone, name,
                    passwordHash: await hashPassword(crypto.randomUUID()),
                    loginToken: token,
                    loginTokenExpiry: expiry,
                }
            });
        } else {
            await platformDb.user.update({
                where: { id: user.id },
                data: { loginToken: token, loginTokenExpiry: expiry }
            });
            // Check existing workspace
            const membership = await platformDb.membership.findFirst({ where: { userId: user.id } });
            if (membership) workspaceId = membership.workspaceId;
        }

        if (!workspaceId) {
            // Create Org + Workspace (trial)
            const org = await platformDb.org.create({
                data: { name: `${name}'s Org`, ownerUserId: user.id }
            });
            const workspace = await platformDb.workspace.create({
                data: { orgId: org.id, name, slug, product: industry || 'SPA', status: 'ACTIVE' }
            });
            workspaceId = workspace.id;

            // Membership
            await platformDb.membership.create({
                data: { workspaceId, userId: user.id, role: 'OWNER' }
            });

            // Trial subscription (14 days)
            await platformDb.subscription.create({
                data: {
                    workspaceId, planKey: 'TRIAL', status: 'TRIAL',
                    currentPeriodEnd: trialEnd,
                }
            });

            // Create EmkAccount (no Lead needed — direct registration)
            const source = landingSlug ? `LP_${(landingSlug as string).toUpperCase().replace(/-/g, '_')}` : 'DIRECT';

            await platformDb.emkAccount.create({
                data: {
                    workspaceId,
                    plan: 'TRIAL',
                    trialEndAt: trialEnd,
                },
            });

            // Log events
            await logEvent({ type: 'USER_REGISTERED', actorUserId: user.id, workspaceId, payload: { name, phone, industry, slug, source, utmSource, utmCampaign, utmMedium } });
            await logEvent({ type: 'WORKSPACE_CREATED', actorUserId: user.id, workspaceId, payload: { slug } });
            await logEvent({ type: 'TRIAL_STARTED', actorUserId: user.id, workspaceId, payload: { trialEnd: trialEnd.toISOString() } });
        } else {
            await logEvent({ type: 'LANDING_SUBMIT', actorUserId: user.id, workspaceId, payload: { name, phone, returning: true } });
        }

        return NextResponse.json({
            success: true,
            loginToken: token,
            workspaceSlug: slug,
        });

    } catch (error: unknown) {
        console.error('[LANDING_SUBMIT]', error);
        return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
    }
}
