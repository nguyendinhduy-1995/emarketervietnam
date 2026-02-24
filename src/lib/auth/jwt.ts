import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { cookies } from 'next/headers';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export interface TokenPayload extends JWTPayload {
    userId: string;
    email: string;
    name: string;
    isAdmin?: boolean;
}

export async function signToken(payload: TokenPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, secret);
        return payload as TokenPayload;
    } catch {
        return null;
    }
}

// ─── Hub Session (cookie: token) ────────────────────────────

export async function getSession(): Promise<TokenPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function setSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
    });
}

export async function clearSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('token');
}

// ─── CRM Session (cookie: crm_token) ───────────────────────

export async function getCrmSession(): Promise<TokenPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get('crm_token')?.value;
    if (!token) return null;
    return verifyToken(token);
}

export async function setCrmSessionCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set('crm_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
    });
}

export async function clearCrmSessionCookie() {
    const cookieStore = await cookies();
    cookieStore.delete('crm_token');
}
