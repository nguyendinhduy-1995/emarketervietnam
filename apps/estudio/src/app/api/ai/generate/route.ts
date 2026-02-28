import { NextRequest, NextResponse } from 'next/server';

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * POST /api/ai/generate
 * Server-side Gemini AI proxy — keeps API key safe.
 * Body: { prompt, mode, json?, model? }
 */
export async function POST(req: NextRequest) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    const { prompt, json: wantJson, model } = await req.json();
    if (!prompt) {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const modelName = model || 'gemini-2.5-flash';
    const url = `${GEMINI_URL}/${modelName}:generateContent?key=${key}`;

    const body: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
    };
    if (wantJson) {
        body.generationConfig = { responseMimeType: 'application/json' };
    }

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json({ error: `Gemini API Error (${res.status}): ${errText.slice(0, 200)}` }, { status: res.status });
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (wantJson) {
        try {
            const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return NextResponse.json({ result: JSON.parse(clean) });
        } catch {
            return NextResponse.json({ result: text });
        }
    }

    return NextResponse.json({ result: text });
}
