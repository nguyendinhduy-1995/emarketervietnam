/**
 * Entitlement Signing — Ed25519 (EdDSA)
 * 
 * Hub ký snapshot bằng PRIVATE key.
 * CRM instance verify bằng PUBLIC key.
 * 
 * Lý do:
 * - HMAC-SHA256 = cùng secret 2 bên → lộ secret ở instance = forge token
 * - Ed25519 = Hub giữ private key, instance chỉ cần public key
 *   → dù lộ public key cũng KHÔNG thể forge token
 * 
 * ENV:
 *   ENTITLEMENT_PRIVATE_KEY — base64-encoded Ed25519 private key (Hub only)
 *   ENTITLEMENT_PUBLIC_KEY  — base64-encoded Ed25519 public key (both Hub + instance)
 * 
 * Key generation:
 *   import { generateKeyPair } from '@/lib/entitlement-signing';
 *   const { publicKey, privateKey } = generateKeyPair();
 */
import crypto from 'crypto';

// ── Key Generation ────────────────────────────────────────────

export function generateKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return {
        publicKey: Buffer.from(publicKey).toString('base64'),
        privateKey: Buffer.from(privateKey).toString('base64'),
    };
}

// ── Signing (Hub side) ────────────────────────────────────────

/**
 * Sign a snapshot payload using Ed25519 private key.
 * Returns base64-encoded signature.
 */
export function signSnapshot(payload: object): string {
    const privateKeyPem = getPrivateKey();
    const data = canonicalize(payload);
    const signature = crypto.sign(null, Buffer.from(data), privateKeyPem);
    return signature.toString('base64');
}

// ── Verification (Instance side) ──────────────────────────────

/**
 * Verify a snapshot signature using Ed25519 public key.
 * Returns true if valid.
 */
export function verifySnapshot(payload: object, signature: string): boolean {
    const publicKeyPem = getPublicKey();
    const data = canonicalize(payload);
    try {
        return crypto.verify(null, Buffer.from(data), publicKeyPem, Buffer.from(signature, 'base64'));
    } catch {
        return false;
    }
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Canonical JSON serialization (sorted keys, no whitespace).
 * Ensures identical payloads produce identical signatures.
 */
function canonicalize(obj: object): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

function getPrivateKey(): string {
    const b64 = process.env.ENTITLEMENT_PRIVATE_KEY;
    if (!b64) throw new Error('ENTITLEMENT_PRIVATE_KEY not set. Generate with generateKeyPair().');
    return Buffer.from(b64, 'base64').toString('utf-8');
}

function getPublicKey(): string {
    const b64 = process.env.ENTITLEMENT_PUBLIC_KEY;
    if (!b64) throw new Error('ENTITLEMENT_PUBLIC_KEY not set.');
    return Buffer.from(b64, 'base64').toString('utf-8');
}

// ── Snapshot payload binding check (instance side) ────────────

interface SnapshotBinding {
    workspaceId: string;
    instanceId: string;
    boundDomain: string;
    productKey?: string;
    expiresAt: string;
}

/**
 * Verify all bindings in a snapshot match the current instance.
 * Must be called AFTER signature verification.
 */
export function verifyBinding(
    snapshot: SnapshotBinding,
    expected: { workspaceId: string; instanceId: string; domain: string; productKey?: string }
): { valid: boolean; reason?: string } {
    if (snapshot.workspaceId !== expected.workspaceId) {
        return { valid: false, reason: `workspaceId mismatch: ${snapshot.workspaceId} ≠ ${expected.workspaceId}` };
    }
    if (snapshot.instanceId !== expected.instanceId) {
        return { valid: false, reason: `instanceId mismatch: ${snapshot.instanceId} ≠ ${expected.instanceId}` };
    }
    if (snapshot.boundDomain !== expected.domain) {
        return { valid: false, reason: `domain mismatch: ${snapshot.boundDomain} ≠ ${expected.domain}` };
    }
    if (expected.productKey && snapshot.productKey && snapshot.productKey !== expected.productKey) {
        return { valid: false, reason: `productKey mismatch: ${snapshot.productKey} ≠ ${expected.productKey}` };
    }
    // Check expiry
    if (new Date(snapshot.expiresAt) < new Date()) {
        return { valid: false, reason: 'Snapshot expired' };
    }
    return { valid: true };
}
