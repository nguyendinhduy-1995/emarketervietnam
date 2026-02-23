import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { decryptKey } from '@/lib/auth/encryption';

// Example: using fetch to call OpenAI directly (avoiding heavy SDK dependencies for this MVP)
export async function POST(req: Request, { params }: { params: Promise<{ spaSlug: string }> }) {
    try {
        const { spaSlug } = await params;
        const body = await req.json();
        const { messages } = body;

        const ws = await platformDb.workspace.findUnique({
            where: { slug: spaSlug },
            include: { aiProviderKeys: true },
        });

        if (!ws) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });

        // Check entitlement for AI_SUITE
        const aiEntitlement = await platformDb.entitlement.findFirst({
            where: {
                workspaceId: ws.id,
                moduleKey: 'ai_suite', // Ensure this matches MODULE_KEYS.AI_SUITE
                status: 'ACTIVE',
            },
        });

        if (!aiEntitlement) {
            return NextResponse.json({ error: 'AI Suite module not activated.' }, { status: 403 });
        }

        // Find an active OpenAI key
        const openAiKeyRecord = ws.aiProviderKeys.find(k => k.provider === 'OPENAI' && k.status === 'ACTIVE');

        if (!openAiKeyRecord) {
            return NextResponse.json({ error: 'No active OpenAI key configured in AI Vault.' }, { status: 400 });
        }

        const apiKey = decryptKey(
            openAiKeyRecord.keyCiphertext,
            openAiKeyRecord.keyIv,
            openAiKeyRecord.keyAuthTag
        );

        // System prompt for the Spa Assistant
        const systemPrompt = {
            role: 'system',
            content: `Bạn là trợ lý AI thông minh của Spa "${ws.name}". 
Nhiệm vụ của bạn là giúp chủ Spa hoặc quản lý giải đáp các thắc mắc về kinh doanh spa, 
gợi ý cách nói chuyện với khách hàng, hoặc tư vấn chiến lược marketing, chăm sóc da. 
Luôn trả lời lịch sự, chuyên nghiệp, ngắn gọn và hữu ích.`,
        };

        const apiMessages = [systemPrompt, ...messages];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: apiMessages,
                temperature: 0.7,
                max_tokens: 1000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('[OPENAI_API_ERROR]', errorData);
            return NextResponse.json({ error: 'Error calling AI Provider' }, { status: 502 });
        }

        const completion = await response.json();
        const aiMessage = completion.choices[0].message;

        return NextResponse.json({ message: aiMessage });

    } catch (error) {
        console.error('[AI_CHAT_ERROR]', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
