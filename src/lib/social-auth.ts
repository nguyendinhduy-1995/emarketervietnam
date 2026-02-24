import db from '@/lib/db';
import { createCustomerToken, getCustomerCookieOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';

/**
 * Find or create a user from social login data, then set session cookie.
 */
export async function handleSocialLogin(profile: {
    provider: string;
    providerAccountId: string;
    name: string;
    email?: string | null;
    avatar?: string | null;
}) {
    // 1. Check if this provider account already linked
    let user = await db.user.findFirst({
        where: {
            accounts: {
                some: {
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                },
            },
        },
    });

    if (!user) {
        // 2. Check if email matches existing user
        if (profile.email) {
            user = await db.user.findUnique({ where: { email: profile.email } });
        }

        if (user) {
            // Link this social account to existing user
            await db.account.create({
                data: {
                    userId: user.id,
                    type: 'oauth',
                    provider: profile.provider,
                    providerAccountId: profile.providerAccountId,
                },
            });
            // Update avatar if not set
            if (!user.avatar && profile.avatar) {
                await db.user.update({ where: { id: user.id }, data: { avatar: profile.avatar } });
            }
        } else {
            // 3. Create new user + link account
            user = await db.user.create({
                data: {
                    name: profile.name,
                    email: profile.email,
                    avatar: profile.avatar,
                    role: 'CUSTOMER',
                    accounts: {
                        create: {
                            type: 'oauth',
                            provider: profile.provider,
                            providerAccountId: profile.providerAccountId,
                        },
                    },
                },
            });
        }
    }

    // Create session
    const token = createCustomerToken({
        userId: user.id,
        name: user.name || profile.name,
        phone: user.phone || '',
        email: user.email,
        role: user.role,
    });

    const cookieOpts = getCustomerCookieOptions();
    const response = NextResponse.redirect(new URL('/account', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
    response.cookies.set(cookieOpts.name, token, {
        maxAge: cookieOpts.maxAge,
        httpOnly: cookieOpts.httpOnly,
        sameSite: cookieOpts.sameSite,
        path: cookieOpts.path,
        secure: cookieOpts.secure,
    });

    return response;
}
