import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' });

const SYSTEM_PROMPT = `Bạn là chuyên gia viết nội dung sản phẩm kính mắt cho cửa hàng "Siêu Thị Mắt Kính".

QUY TẮC BẮT BUỘC:
1. Nếu không có thông số (lens width, bridge, temple length, material) → ĐỂ TRỐNG (null) và thêm disclaimer. TUYỆT ĐỐI KHÔNG BỊA SỐ ĐO.
2. KHÔNG bịa thông số vật liệu nếu không rõ từ ảnh hoặc input
3. KHÔNG hứa hẹn về y tế/điều trị
4. Tất cả giá phải đúng với giá user cung cấp
5. Nội dung phải phù hợp với tone voice được chọn

CÔNG THỨC TRANG SẢN PHẨM KÍNH (7 phần):
Mục tiêu: khách đọc 15-30 giây hiểu: hợp ai – lợi gì – mua sao – yên tâm không.

1. H1 = Tên kính + điểm nổi bật chính (1 cụm)
   VD: "Gọng Kính Titanium Siêu Nhẹ – Ôm mặt, đeo cả ngày không đau tai"

2. Hook 2 dòng (đúng nỗi đau khách hàng)
   VD: "Đeo 2 tiếng là đau sống mũi? Gọng này sinh ra để giải quyết chuyện đó."

3. 3 lợi ích theo TÌNH HUỐNG cụ thể (không nói chung chung):
   - VD: Nhẹ → đi làm 8-10 tiếng vẫn dễ chịu
   - Ôm mặt → không tuột khi chạy xe/đi bộ
   - Bền → hạn chế cong vênh do nhiệt/va chạm nhẹ

4. "Ai nên chọn" (rất quan trọng):
   - Hợp: mặt tròn/mặt trái xoan, người đeo kính cả ngày, làm văn phòng
   - Chưa hợp lắm: mặt quá nhỏ (nếu size lớn) / thích gọng bản to

5. Thông số (đưa con số nếu có, KHÔNG bịa nếu không có):
   - Size: 52-18-140 | Chất liệu: Titanium | Trọng lượng: ~12g

6. Bằng chứng & niềm tin:
   - Cam kết chính hãng, đánh giá, feedback

7. CTA + chính sách:
   - Chọn màu → Thêm giỏ → Thanh toán
   - Đổi trả 14 ngày | Ship COD | Bảo hành 12 tháng | Freeship từ 500K

OUTPUT phải là JSON hợp lệ theo schema sau:
{
  "titleOptions": ["H1 option 1 (tên + điểm nổi bật)", "option 2", "option 3"],
  "hook": "2 dòng hook nỗi đau khách hàng",
  "shortDesc": "Mô tả ngắn (2-3 câu)",
  "longDesc": "Mô tả chi tiết (theo 7 phần trên)",
  "benefits": ["Lợi ích 1 theo tình huống", "Lợi ích 2", "Lợi ích 3"],
  "targetAudience": {"suitable": ["Ai hợp 1", "Ai hợp 2"], "notSuitable": ["Chưa hợp 1"]},
  "bullets": ["Điểm nổi bật 1", "...", "..."],
  "inferredAttributes": {
    "shape": {"value": "...", "confidence": 0.9},
    "material": {"value": "...", "confidence": 0.7},
    "style": {"value": "...", "confidence": 0.8},
    "targetGender": {"value": "...", "confidence": 0.6},
    "usage": {"value": "...", "confidence": 0.8}
  },
  "suggestedSpecs": {
    "lensWidth": null, "bridge": null, "templeLength": null,
    "frameShape": "...", "material": null
  },
  "tags": ["tag1", "tag2"],
  "seo": {
    "metaTitle": "H1-based SEO title",
    "metaDescription": "150-160 ký tự, chứa lợi ích + CTA",
    "slug": "..."
  },
  "social": {
    "facebook": ["Post FB có hook + emoji + CTA"],
    "tiktokCaption": ["Caption TikTok ngắn + hashtag"],
    "zalo": ["Tin nhắn Zalo OA chuyên nghiệp"]
  },
  "disclaimers": ["..."],
  "cta": "Chọn màu → Thêm giỏ → Thanh toán",
  "policies": ["Đổi trả 14 ngày", "Freeship từ 500K", "Bảo hành 12 tháng", "Ship COD toàn quốc"]
}`;

const TONE_MAP: Record<string, string> = {
    casual: 'Giọng bình dân, thân thiện, dễ hiểu, hướng đại chúng',
    premium: 'Giọng sang trọng, tinh tế, dành cho khách hàng cao cấp — minimalist, ít chữ nhưng đắt từ',
    young: 'Giọng trẻ trung, năng động, Gen Z, trendy, có chút humor',
    kol_review: 'Giọng như KOL/influencer review sản phẩm, chân thật, có cảm xúc, storytelling',
};

const CHANNEL_MAP: Record<string, string> = {
    website: 'Nội dung cho trang web sản phẩm, SEO-friendly, đầy đủ 7 phần theo công thức',
    facebook: 'Post Facebook ngắn gọn, có emoji, hook mạnh (nỗi đau), CTA rõ, 3-5 dòng',
    tiktok: 'Caption TikTok ngắn, viral, trending hashtag, hài hước/cuốn hút',
    zalo: 'Tin nhắn Zalo OA, lịch sự, chuyên nghiệp, có ưu đãi, ngắn gọn',
};

/* ═══ POST /api/smk/admin/ai/product-content ═══ */
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const body = await req.json();
    const { name, price, imageUrls = [], channel = 'website', tone = 'casual', specs } = body;

    if (!name) {
        return NextResponse.json({ error: 'Tên sản phẩm là bắt buộc' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
        // Fallback: generate template content without AI
        const result = generateFallbackContent(name, price, channel, tone, specs);
        await db.aIContentLog.create({
            data: { channel, tone, input: body, output: result, tokens: 0, latencyMs: 0, applied: false, createdBy: 'system' },
        });
        return NextResponse.json(result);
    }

    const start = Date.now();

    try {
        const toneDesc = TONE_MAP[tone] || TONE_MAP.casual;
        const channelDesc = CHANNEL_MAP[channel] || CHANNEL_MAP.website;

        // Build specs context for prompt
        let specsContext = 'Thông số: Chưa có (KHÔNG được bịa, để null)';
        if (specs) {
            const parts: string[] = [];
            if (specs.lensWidth) parts.push(`Lens Width: ${specs.lensWidth}mm`);
            if (specs.bridge) parts.push(`Bridge: ${specs.bridge}mm`);
            if (specs.templeLength) parts.push(`Temple: ${specs.templeLength}mm`);
            if (specs.frameShape) parts.push(`Shape: ${specs.frameShape}`);
            if (specs.material) parts.push(`Material: ${specs.material}`);
            if (specs.frameType) parts.push(`Frame Type: ${specs.frameType}`);
            if (specs.weight) parts.push(`Weight: ${specs.weight}g`);
            if (specs.fit) parts.push(`Fit: ${specs.fit}`);
            if (specs.gender) parts.push(`Gender: ${specs.gender}`);
            if (specs.uvProtection) parts.push(`UV: ${specs.uvProtection}`);
            if (specs.blueLightBlock) parts.push('Blue-light: Có');
            if (specs.specsUnknown) parts.push('⚠️ User đánh dấu "Chưa rõ" — KHÔNG bịa, thêm disclaimer');
            specsContext = parts.length > 0 ? `Thông số xác nhận: ${parts.join(' | ')}` : specsContext;
        }

        const userPrompt = `Sản phẩm: ${name}
Giá: ${price ? new Intl.NumberFormat('vi-VN').format(price) + 'đ' : 'Chưa có'}
${specsContext}
Tone: ${toneDesc}
Kênh: ${channelDesc}
Số ảnh: ${imageUrls.length}

Hãy tạo nội dung cho sản phẩm kính mắt theo CÔNG THỨC 7 PHẦN. Trả về JSON theo schema đã cho.
QUAN TRỌNG: Chỉ dùng thông số đã cung cấp, KHÔNG bịa bất kỳ số đo nào.`;

        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
            { role: 'system', content: SYSTEM_PROMPT },
        ];

        // If images provided, use vision
        if (imageUrls.length > 0) {
            const content: OpenAI.Chat.ChatCompletionContentPart[] = [
                { type: 'text', text: userPrompt },
                ...imageUrls.slice(0, 5).map((url: string) => ({
                    type: 'image_url' as const,
                    image_url: { url, detail: 'low' as const },
                })),
            ];
            messages.push({ role: 'user', content });
        } else {
            messages.push({ role: 'user', content: userPrompt });
        }

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 2000,
            temperature: 0.7,
            response_format: { type: 'json_object' },
        });

        const rawOutput = completion.choices[0]?.message?.content || '{}';
        const output = JSON.parse(rawOutput);
        const latencyMs = Date.now() - start;
        const tokens = completion.usage?.total_tokens || 0;

        // Log usage
        await db.aIContentLog.create({
            data: { channel, tone, input: body, output, tokens, latencyMs, applied: false, createdBy: 'system' },
        });

        return NextResponse.json(output);
    } catch (e: unknown) {
        console.error('[AI Content]', e);
        // Fallback on error
        const result = generateFallbackContent(name, price, channel, tone);
        return NextResponse.json(result);
    }
}

function generateFallbackContent(name: string, price: number, channel: string, tone: string, specs?: any) {
    const priceStr = price ? new Intl.NumberFormat('vi-VN').format(price) + 'đ' : '';
    const toneAdj = tone === 'premium' ? 'sang trọng' : tone === 'young' ? 'cá tính' : 'thời trang';

    // Build specs string from actual data (never fabricate)
    const specParts: string[] = [];
    if (specs?.lensWidth && specs?.bridge && specs?.templeLength) {
        specParts.push(`Size: ${specs.lensWidth}-${specs.bridge}-${specs.templeLength}`);
    }
    if (specs?.material) specParts.push(`Chất liệu: ${specs.material}`);
    if (specs?.weight) specParts.push(`Trọng lượng: ~${specs.weight}g`);
    const specsLine = specParts.length > 0 ? specParts.join(' | ') : null;

    const disclaimers: string[] = [];
    if (!specsLine) disclaimers.push('Thông số kính (lens width, bridge, temple) cần xác nhận thủ công');
    if (specs?.specsUnknown) disclaimers.push('Người bán đánh dấu "Chưa rõ" — vui lòng xác nhận thông số trước khi mua');

    return {
        titleOptions: [
            `${name} – ${toneAdj}, Đeo Cả Ngày Không Mỏi`,
            `Kính ${name} Chính Hãng | Siêu Thị Mắt Kính`,
            `${name} – Phong Cách & Chất Lượng`,
        ],
        hook: `Đeo kính cả ngày mà vẫn đau sống mũi? ${name} giải quyết chuyện đó – nhẹ, ôm mặt, thoải mái từ sáng đến tối.`,
        shortDesc: `${name} – mẫu kính ${toneAdj} bán chạy tại Siêu Thị Mắt Kính. Chất lượng cao, bảo hành chính hãng.${priceStr ? ` Giá chỉ ${priceStr}.` : ''}`,
        longDesc: `${name} là sản phẩm kính mắt ${toneAdj} được yêu thích nhất tại Siêu Thị Mắt Kính.\n\nThiết kế hiện đại, chất liệu cao cấp, phù hợp mọi khuôn mặt.\n\n${specsLine ? `📐 Thông số: ${specsLine}` : '📐 Thông số: Cần xác nhận'}\n\n✅ Cam kết chính hãng 100%\n✅ Đổi trả 14 ngày\n✅ Bảo hành 12 tháng\n✅ Freeship đơn từ 500K`,
        benefits: [
            `Nhẹ nhàng – đeo 8-10 tiếng làm việc vẫn thoải mái`,
            `Ôm mặt – không tuột khi di chuyển, chạy xe`,
            `Bền bỉ – hạn chế cong vênh do va chạm nhẹ`,
        ],
        targetAudience: {
            suitable: ['Người đeo kính cả ngày', 'Làm văn phòng', 'Phong cách thời trang'],
            notSuitable: ['Cần kiểm tra size trước (liên hệ tư vấn)'],
        },
        bullets: [
            'Thiết kế hiện đại, phù hợp nhiều phong cách',
            'Chất liệu cao cấp, bền bỉ',
            'Bảo hành chính hãng 12 tháng',
            'Đổi trả dễ dàng trong 14 ngày',
            'Miễn phí ship từ 500.000đ',
        ],
        inferredAttributes: {
            shape: { value: specs?.frameShape || null, confidence: specs?.frameShape ? 0.9 : 0 },
            material: { value: specs?.material || null, confidence: specs?.material ? 0.9 : 0 },
            style: { value: toneAdj, confidence: 0.5 },
            targetGender: { value: specs?.gender || 'unisex', confidence: specs?.gender ? 0.8 : 0.3 },
            usage: { value: 'daily', confidence: 0.3 },
        },
        suggestedSpecs: {
            lensWidth: specs?.lensWidth || null,
            bridge: specs?.bridge || null,
            templeLength: specs?.templeLength || null,
            frameShape: specs?.frameShape || null,
            material: specs?.material || null,
        },
        tags: ['kính mắt', name.toLowerCase(), toneAdj],
        seo: {
            metaTitle: `${name} – Mua Chính Hãng, Bảo Hành 12 Tháng | Siêu Thị Mắt Kính`,
            metaDescription: `${name}${priceStr ? ` giá ${priceStr}` : ''} – ${toneAdj}, bền bỉ. Đổi trả 14 ngày, freeship từ 500K. Mua ngay tại Siêu Thị Mắt Kính!`,
            slug: name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-'),
        },
        social: {
            facebook: [
                `🔥 ${name} – ${toneAdj} cực đỉnh!\n${priceStr ? `💰 Chỉ ${priceStr}` : ''}\n✅ Freeship từ 500K\n✅ Đổi trả 14 ngày\n✅ BH 12 tháng\n👉 Inbox/comment để đặt hàng!`,
            ],
            tiktokCaption: [`${name} review nhanh 🧐 #kínhmắt #sunglasses #sieuthimatkinh`],
            zalo: [`Kính ${name} ${priceStr ? `giá ${priceStr}` : ''} – bảo hành 12 tháng. Liên hệ tư vấn ngay!`],
        },
        disclaimers,
        cta: 'Chọn màu → Thêm giỏ → Thanh toán',
        policies: ['Đổi trả 14 ngày', 'Freeship đơn từ 500K', 'Bảo hành 12 tháng', 'Ship COD toàn quốc'],
    };
}
