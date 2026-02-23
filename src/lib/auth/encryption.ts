import crypto from 'crypto';

/**
 * Validates the AI key setup. Decrypts AES-GCM data using a hypothetical master key.
 * Used exclusively by the AI Chat Route.
 */
export function decryptKey(ciphertext: string, ivHex: string, authTagHex: string): string {
    const MASTER_KEY = process.env.ENCRYPTION_MASTER_KEY;
    if (!MASTER_KEY || MASTER_KEY.length !== 32) {
        throw new Error('ENCRYPTION_MASTER_KEY must be exactly 32 bytes.');
    }

    try {
        const decipher = crypto.createDecipheriv(
            'aes-256-gcm',
            Buffer.from(MASTER_KEY, 'utf-8'),
            Buffer.from(ivHex, 'hex')
        );

        decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

        let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        console.error('Decryption failed', error);
        throw new Error('Failed to decrypt API Key');
    }
}
