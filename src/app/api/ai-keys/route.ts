import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { encrypt, maskKey } from '@/lib/encryption';

const saveKeySchema = z.object({
    provider: z.enum(['OPENAI', 'GOOGLE', 'ANTHROPIC']),
    apiKey: z.string().min(10),
});

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);
    if (!workspaceId) {
        return NextResponse.json({ error: 'No workspace' }, { status: 404 });
    }

    const keys = await platformDb.aiProviderKey.findMany({
        where: { workspaceId },
        select: {
            id: true,
            provider: true,
            keyLast4: true,
            status: true,
            createdAt: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({ keys });
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const workspaceId = await resolveWorkspaceId(req, authResult.user);
        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace' }, { status: 404 });
        }

        const body = await req.json();
        const data = saveKeySchema.parse(body);

        // Encrypt the key
        const { ciphertext, iv, authTag } = encrypt(data.apiKey);
        const keyLast4 = data.apiKey.slice(-4);

        // Upsert (one key per provider per workspace)
        const key = await platformDb.aiProviderKey.upsert({
            where: {
                workspaceId_provider: {
                    workspaceId,
                    provider: data.provider,
                },
            },
            create: {
                workspaceId,
                provider: data.provider,
                keyCiphertext: ciphertext,
                keyIv: iv,
                keyAuthTag: authTag,
                keyLast4,
            },
            update: {
                keyCiphertext: ciphertext,
                keyIv: iv,
                keyAuthTag: authTag,
                keyLast4,
                status: 'ACTIVE',
            },
        });

        return NextResponse.json({
            id: key.id,
            provider: key.provider,
            maskedKey: maskKey(data.apiKey),
            status: key.status,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
        }
        console.error('[AI-KEYS]', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);
    if (!workspaceId) {
        return NextResponse.json({ error: 'No workspace' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
        return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    await platformDb.aiProviderKey.updateMany({
        where: { id, workspaceId },
        data: { status: 'REVOKED' },
    });

    return NextResponse.json({ success: true });
}
