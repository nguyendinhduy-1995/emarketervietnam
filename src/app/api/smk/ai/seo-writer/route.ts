import { NextRequest, NextResponse } from 'next/server';
import { chatCompletion } from '@/lib/smk/ai/openai';

export async function POST(req: NextRequest) {
    const { productName, brand, category, material, frameShape, price, description } = await req.json();

    if (!productName) {
        return NextResponse.json({ error: 'productName required' }, { status: 400 });
    }

    const prompt = `Viết SEO metadata cho sản phẩm kính mắt Việt Nam:
- Tên: ${productName}
- Thương hiệu: ${brand || 'N/A'}
- Danh mục: ${category || 'Kính mắt'}
- Chất liệu: ${material || 'N/A'}
- Kiểu gọng: ${frameShape || 'N/A'}
- Giá: ${price ? price.toLocaleString('vi-VN') + '₫' : 'N/A'}
- Mô tả hiện tại: ${description || 'Không có'}

Trả về JSON:
{
  "metaTitle": "tối đa 60 ký tự, có keyword chính",
  "metaDescription": "tối đa 155 ký tự, có call-to-action",
  "keywords": ["keyword1", "keyword2", ...],
  "ogTitle": "tiêu đề social media hấp dẫn",
  "h1Suggestion": "gợi ý thẻ H1"
}`;

    try {
        const result = await chatCompletion(
            'Bạn là chuyên gia SEO cho thương mại điện tử kính mắt Việt Nam. Tối ưu cho Google.vn. Trả về JSON thuần.',
            prompt,
            { temperature: 0.6, maxTokens: 400 }
        );

        const parsed = JSON.parse(result.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
        return NextResponse.json(parsed);
    } catch {
        return NextResponse.json({
            metaTitle: `${productName} - ${brand || 'Kính Mắt'} | Siêu Thị Mắt Kính`,
            metaDescription: `Mua ${productName} ${brand ? 'chính hãng ' + brand : ''} giá tốt. Free ship đơn 500K+, đổi trả 30 ngày, bảo hành 12 tháng.`,
            keywords: [productName.toLowerCase(), brand?.toLowerCase(), 'kính mắt', 'mua kính'].filter(Boolean),
            ogTitle: `${productName} - Siêu Thị Mắt Kính`,
            h1Suggestion: `${productName}${brand ? ' ' + brand : ''}`,
        });
    }
}
