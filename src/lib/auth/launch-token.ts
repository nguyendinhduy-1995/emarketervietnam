import { SignJWT, jwtVerify } from 'jose';

/**
 * Launch Token — short-lived JWT for SSO redirect from Hub to App.
 * 
 * Flow:
 * 1. User clicks "Mở App" on Hub
 * 2. Hub creates launchToken (60s TTL)
 * 3. User redirected to App with ?launch=<token>
 * 4. App calls Hub /api/hub/launch/verify to validate
 * 5. App creates local session from verified payload
 */

const LAUNCH_SECRET = new TextEncoder().encode(
    process.env.LAUNCH_TOKEN_SECRET || 'dev-launch-token-secret'
);

export interface LaunchTokenPayload {
    userId: string;
    userName: string;
    email: string;
    workspaceId: string;
    appKey: string;        // which app is being launched
    entitlements: string[]; // active module keys
}

/**
 * Sign a launch token (60s TTL — user must redirect immediately).
 */
export async function signLaunchToken(payload: LaunchTokenPayload): Promise<string> {
    return new SignJWT(payload as unknown as Record<string, unknown>)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('60s')
        .setSubject(payload.userId)
        .sign(LAUNCH_SECRET);
}

/**
 * Verify a launch token.
 * Returns the payload or null if invalid/expired.
 */
export async function verifyLaunchToken(token: string): Promise<LaunchTokenPayload | null> {
    try {
        const { payload } = await jwtVerify(token, LAUNCH_SECRET);
        return payload as unknown as LaunchTokenPayload;
    } catch {
        return null;
    }
}
