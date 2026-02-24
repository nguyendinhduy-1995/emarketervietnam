import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/smk/ai/openai';

export async function POST(req: NextRequest) {
    const { reason, description, type } = await req.json();

    if (!reason) {
        return NextResponse.json({ error: 'reason required' }, { status: 400 });
    }

    const prompt = `Phân loại yêu cầu đổi trả kính mắt sau:
Loại: ${type || 'RETURN'}
Lý do: ${reason}
Mô tả thêm: ${description || 'Không có'}

Trả về JSON với format:
{
  "category": "defect" | "wrong_size" | "change_mind" | "warranty" | "other",
  "confidence": 0.0-1.0,
  "recommendation": "approve" | "reject" | "review",
  "reasoning": "Giải thích ngắn gọn"
}`;

    try {
        const result = await chatCompletion(
            'Bạn là chuyên gia xử lý đổi trả cho cửa hàng kính mắt Việt Nam. Trả về JSON thuần không markdown.',
            prompt,
            { temperature: 0.3, maxTokens: 200 }
        );

        const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        return NextResponse.json(parsed);
    } catch {
        // Fallback classification
        const lowerReason = (reason + ' ' + (description || '')).toLowerCase();
        let category = 'other';
        let recommendation = 'review';

        if (lowerReason.includes('lỗi') || lowerReason.includes('hỏng') || lowerReason.includes('gãy') || lowerReason.includes('xước')) {
            category = 'defect'; recommendation = 'approve';
        } else if (lowerReason.includes('size') || lowerReason.includes('kích') || lowerReason.includes('chật') || lowerReason.includes('rộng')) {
            category = 'wrong_size'; recommendation = 'approve';
        } else if (lowerReason.includes('đổi ý') || lowerReason.includes('không thích') || lowerReason.includes('không hợp')) {
            category = 'change_mind'; recommendation = 'review';
        } else if (lowerReason.includes('bảo hành') || lowerReason.includes('warranty')) {
            category = 'warranty'; recommendation = 'approve';
        }

        return NextResponse.json({
            category,
            confidence: 0.7,
            recommendation,
            reasoning: `Phân loại tự động dựa trên từ khóa: "${reason.slice(0, 50)}"`,
        });
    }
}
