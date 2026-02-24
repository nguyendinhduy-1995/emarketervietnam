import { NextResponse } from 'next/server';
import { imageEdit } from '@/lib/smk/ai/openai';
import { randomUUID } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'public', 'try-on-results');

// Rate limit: track IP → count in memory (simple approach)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_DAY = 5;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + 24 * 60 * 60 * 1000 });
        return true;
    }
    if (entry.count >= MAX_PER_DAY) return false;
    entry.count++;
    return true;
}

export async function POST(req: Request) {
    try {
        const { imageBase64, productName, productBrand, frameShape } = await req.json();

        if (!imageBase64 || !productName) {
            return NextResponse.json({ error: 'Thiếu ảnh hoặc thông tin sản phẩm' }, { status: 400 });
        }

        // Rate limit
        const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
        if (!checkRateLimit(ip)) {
            return NextResponse.json(
                { error: 'Bạn đã đạt giới hạn 5 lần thử/ngày. Vui lòng quay lại ngày mai.' },
                { status: 429 }
            );
        }

        // Build prompt
        const prompt = `Hãy chỉnh sửa bức ảnh này: Thêm một cặp kính ${productName} (${productBrand || 'thương hiệu cao cấp'}, kiểu ${frameShape || 'thời trang'}) lên khuôn mặt người trong ảnh. 
Kính phải vừa vặn với khuôn mặt, đúng tỉ lệ, và trông tự nhiên như thật.
Giữ nguyên nền, biểu cảm, và các chi tiết khác trong ảnh gốc.
Kính phải có bóng đổ nhẹ để trông chân thực.`;

        // Call OpenAI
        const resultBase64 = await imageEdit(imageBase64, prompt);

        if (!resultBase64) {
            return NextResponse.json({ error: 'Không tạo được ảnh. Vui lòng thử lại.' }, { status: 500 });
        }

        // Save to disk
        await mkdir(RESULTS_DIR, { recursive: true });
        const filename = `${randomUUID()}.png`;
        const filepath = path.join(RESULTS_DIR, filename);
        await writeFile(filepath, Buffer.from(resultBase64, 'base64'));

        const resultUrl = `/try-on-results/${filename}`;

        return NextResponse.json({
            success: true,
            resultUrl,
            resultBase64: `data:image/png;base64,${resultBase64}`,
        });
    } catch (error: unknown) {
        console.error('Try-on error:', error);
        const message = error instanceof Error ? error.message : 'Lỗi không xác định';
        return NextResponse.json({ error: `Lỗi xử lý: ${message}` }, { status: 500 });
    }
}
