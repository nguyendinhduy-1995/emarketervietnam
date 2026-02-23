import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';
import { signToken, setSessionCookie } from '@/lib/auth/jwt';
import { generateUniqueSlug } from '@/lib/slug';
import { enqueueProvisioningJob } from '@/lib/queue/provisioning';

const signupSchema = z.object({
    spaName: z.string().min(2).max(100),
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(2).max(100),
    phone: z.string().optional(),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = signupSchema.parse(body);

        // Check if email already exists
        const existingUser = await platformDb.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Email đã được sử dụng' },
                { status: 409 }
            );
        }

        // Generate unique slug
        const slug = await generateUniqueSlug(data.spaName);

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create everything in a transaction
        const result = await platformDb.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    passwordHash,
                    name: data.name,
                    phone: data.phone,
                },
            });

            // 2. Create Org
            const org = await tx.org.create({
                data: {
                    name: data.spaName,
                    ownerUserId: user.id,
                },
            });

            // 3. Create Workspace
            const workspace = await tx.workspace.create({
                data: {
                    orgId: org.id,
                    name: data.spaName,
                    slug,
                    product: 'SPA',
                },
            });

            // 4. Create Membership (OWNER)
            await tx.membership.create({
                data: {
                    workspaceId: workspace.id,
                    userId: user.id,
                    role: 'OWNER',
                },
            });

            // 5. Create Subscription (FREE)
            await tx.subscription.create({
                data: {
                    workspaceId: workspace.id,
                    planKey: 'FREE',
                    status: 'ACTIVE',
                    currentPeriodEnd: null, // FREE = never expires
                },
            });

            // 6. Create ProductInstance (PENDING)
            const isProd = process.env.NODE_ENV === 'production';
            const protocol = isProd ? 'https://' : 'http://';
            const baseHost = isProd ? 'crmspa.emarketervietnam.vn' : 'crmspa.localhost:3000';
            const baseUrl = `${protocol}${baseHost}/${slug}`;
            await tx.productInstance.create({
                data: {
                    workspaceId: workspace.id,
                    productKey: 'SPA_CRM',
                    baseUrl,
                    status: 'PENDING',
                },
            });

            // 7. Create default ReminderRule
            await tx.reminderRule.create({
                data: {
                    workspaceId: workspace.id,
                    type: 'RENEWAL',
                    offsetsJson: [-7, -3, -1, 1, 3],
                    channelsJson: ['EMAIL'],
                },
            });

            return { user, workspace };
        });

        // Enqueue provisioning job (outside transaction)
        await enqueueProvisioningJob(result.workspace.id);

        // Generate JWT
        const token = await signToken({
            userId: result.user.id,
            email: result.user.email,
            name: result.user.name,
        });

        // Set cookie
        await setSessionCookie(token);

        return NextResponse.json({
            user: {
                id: result.user.id,
                email: result.user.email,
                name: result.user.name,
            },
            workspace: {
                id: result.workspace.id,
                slug: result.workspace.slug,
                name: result.workspace.name,
            },
            crmUrl: process.env.NODE_ENV === 'production'
                ? `https://crmspa.emarketervietnam.vn/${result.workspace.slug}`
                : `http://crmspa.localhost:3000/${result.workspace.slug}`,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Dữ liệu không hợp lệ', details: error.issues },
                { status: 400 }
            );
        }
        console.error('[SIGNUP]', error);
        return NextResponse.json(
            { error: 'Lỗi hệ thống' },
            { status: 500 }
        );
    }
}
