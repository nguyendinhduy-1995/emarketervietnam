import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/smk/ai/openai';

export async function POST(req: NextRequest) {
    const { customerName, orders, spent, tier, recentPurchases } = await req.json();

    const prompt = `Phân tích khách hàng cửa hàng kính mắt:
- Tên: ${customerName}
- Hạng: ${tier}
- Số đơn: ${orders}
- Tổng chi: ${(spent || 0).toLocaleString('vi-VN')}₫
- Mua gần đây: ${recentPurchases || 'Không rõ'}

Trả về JSON:
{
  "churnRisk": "low" | "medium" | "high",
  "churnReason": "lý do ngắn",
  "upsellSuggestion": "gợi ý sản phẩm nên giới thiệu",
  "nextAction": "hành động tiếp theo nên làm",
  "lifetimeValue": "dự đoán giá trị lâu dài"
}`;

    try {
        const result = await chatCompletion(
            'Bạn là chuyên gia CRM cho cửa hàng kính mắt Việt Nam. Phân tích hành vi khách hàng và gợi ý. Trả về JSON thuần.',
            prompt,
            { temperature: 0.5, maxTokens: 300 }
        );

        const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        return NextResponse.json(parsed);
    } catch {
        // Fallback insights
        const churnRisk = orders <= 1 ? 'high' : orders <= 3 ? 'medium' : 'low';
        return NextResponse.json({
            churnRisk,
            churnReason: churnRisk === 'high' ? 'Chỉ mua 1 lần, có thể quên shop' : 'Khách quen, giữ chân tốt',
            upsellSuggestion: tier === 'VIP' ? 'Kính hiệu cao cấp (Gucci, Dior)' : 'Tròng cận loại tốt + gọng thời trang',
            nextAction: churnRisk === 'high' ? 'Gửi voucher giảm 15% qua SMS' : 'Giới thiệu BST mới qua email',
            lifetimeValue: `~${(spent * (orders > 3 ? 2 : 1.5)).toLocaleString('vi-VN')}₫`,
        });
    }
}
