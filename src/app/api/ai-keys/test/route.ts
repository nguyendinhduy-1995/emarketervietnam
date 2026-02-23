import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { decrypt } from '@/lib/encryption';

const testSchema = z.object({
    provider: z.enum(['OPENAI', 'GOOGLE', 'ANTHROPIC']),
});

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const workspaceId = await resolveWorkspaceId(req, authResult.user);
        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace' }, { status: 404 });
        }

        const body = await req.json();
        const data = testSchema.parse(body);

        // Get the key
        const keyRecord = await platformDb.aiProviderKey.findUnique({
            where: {
                workspaceId_provider: { workspaceId, provider: data.provider },
            },
        });

        if (!keyRecord || keyRecord.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Key not found or revoked' }, { status: 404 });
        }

        // Decrypt
        const apiKey = decrypt(keyRecord.keyCiphertext, keyRecord.keyIv, keyRecord.keyAuthTag);

        // Test connection based on provider
        let success = false;
        let message = '';

        try {
            if (data.provider === 'OPENAI') {
                const res = await fetch('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${apiKey}` },
                });
                success = res.ok;
                message = success ? 'Connected to OpenAI' : `OpenAI returned ${res.status}`;
            } else if (data.provider === 'GOOGLE') {
                // Simple test for Google AI
                success = apiKey.length > 20;
                message = success ? 'Key format valid (Google AI)' : 'Invalid key format';
            } else if (data.provider === 'ANTHROPIC') {
                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'x-api-key': apiKey,
                        'anthropic-version': '2023-06-01',
                        'content-type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-haiku-20240307',
                        max_tokens: 1,
                        messages: [{ role: 'user', content: 'test' }],
                    }),
                });
                success = res.ok;
                message = success ? 'Connected to Anthropic' : `Anthropic returned ${res.status}`;
            }
        } catch {
            message = 'Connection failed';
        }

        return NextResponse.json({ success, message, provider: data.provider });
    } catch (error) {
        console.error('[AI-KEYS-TEST]', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
