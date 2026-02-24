import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/smk/ai/openai';

export async function POST(req: NextRequest) {
    const { partnerCode, returnRate, cancelRate, selfPurchases, sameDeviceOrders, totalOrders, revenue } = await req.json();

    const prompt = `Phân tích hành vi đối tác affiliate bán kính mắt:
- Mã đối tác: ${partnerCode}
- Tổng đơn: ${totalOrders || 0}
- Doanh thu: ${(revenue || 0).toLocaleString('vi-VN')}₫
- Tỉ lệ hoàn: ${returnRate || 0}%
- Tỉ lệ huỷ: ${cancelRate || 0}%
- Đơn tự mua: ${selfPurchases || 0}
- Đơn cùng thiết bị: ${sameDeviceOrders || 0}

Phân tích xem có dấu hiệu gian lận không. Trả về JSON:
{
  "riskScore": 0-100,
  "riskLevel": "low" | "medium" | "high" | "critical",
  "patterns": ["pattern đáng ngờ 1", "pattern 2"],
  "recommendation": "Gợi ý hành động cụ thể",
  "explanation": "Giải thích chi tiết"
}`;

    try {
        const result = await chatCompletion(
            'Bạn là chuyên gia chống gian lận affiliate. Phân tích pattern bất thường. Trả về JSON thuần.',
            prompt,
            { temperature: 0.3, maxTokens: 400 }
        );

        const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        return NextResponse.json(parsed);
    } catch {
        const riskScore = Math.min(100,
            (returnRate > 30 ? 30 : 0) +
            (cancelRate > 20 ? 20 : 0) +
            (selfPurchases > 5 ? 25 : selfPurchases > 2 ? 15 : 0) +
            (sameDeviceOrders > 3 ? 25 : 0)
        );

        return NextResponse.json({
            riskScore,
            riskLevel: riskScore >= 70 ? 'critical' : riskScore >= 40 ? 'high' : riskScore >= 20 ? 'medium' : 'low',
            patterns: [
                returnRate > 30 && 'Tỉ lệ hoàn hàng cao bất thường',
                selfPurchases > 2 && 'Nhiều đơn tự mua',
                sameDeviceOrders > 3 && 'Nhiều đơn từ cùng thiết bị',
            ].filter(Boolean),
            recommendation: riskScore >= 70 ? 'Tạm giữ hoa hồng và điều tra' : 'Tiếp tục theo dõi',
            explanation: `Đánh giá tự động: Risk score ${riskScore}/100`,
        });
    }
}
