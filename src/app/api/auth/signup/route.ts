import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';
import { signToken, setSessionCookie } from '@/lib/auth/jwt';
import { generateUniqueSlug } from '@/lib/slug';


const signupSchema = z.object({
    workspaceName: z.string().min(2).max(100),
    phone: z.string().min(9).max(15),
    password: z.string().min(6),
    name: z.string().min(2).max(100),
    email: z.string().email().optional().or(z.literal('')),
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const data = signupSchema.parse(body);

        // Normalize phone
        const normalizedPhone = data.phone.replace(/[\s\-]/g, '');

        // Check if phone already exists
        const existingUser = await platformDb.user.findUnique({
            where: { phone: normalizedPhone },
        });
        if (existingUser) {
            return NextResponse.json(
                { error: 'Số điện thoại đã được sử dụng' },
                { status: 409 }
            );
        }

        // Also check email if provided
        if (data.email) {
            const existingEmail = await platformDb.user.findUnique({
                where: { email: data.email },
            });
            if (existingEmail) {
                return NextResponse.json(
                    { error: 'Email đã được sử dụng' },
                    { status: 409 }
                );
            }
        }

        // Generate unique slug
        const slug = await generateUniqueSlug(data.workspaceName);

        // Hash password
        const passwordHash = await hashPassword(data.password);

        // Create everything in a transaction
        const result = await platformDb.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    phone: normalizedPhone,
                    email: data.email || null,
                    passwordHash,
                    name: data.name,
                },
            });

            // 2. Create Org
            const org = await tx.org.create({
                data: {
                    name: data.workspaceName,
                    ownerUserId: user.id,
                },
            });

            // 3. Create Workspace
            const workspace = await tx.workspace.create({
                data: {
                    orgId: org.id,
                    name: data.workspaceName,
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


        // Generate JWT
        const token = await signToken({
            userId: result.user.id,
            email: result.user.email || result.user.phone,
            name: result.user.name,
        });

        // Set cookie
        await setSessionCookie(token);

        return NextResponse.json({
            user: {
                id: result.user.id,
                phone: result.user.phone,
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
