import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { visionAnalysis } from '@/lib/smk/ai/openai';

const VISION_PROMPT = `Phân tích hình ảnh kính mắt này và trả về JSON với các trường:
{
  "frameShape": "SQUARE" | "ROUND" | "OVAL" | "CAT_EYE" | "AVIATOR" | "RECTANGLE" | "GEOMETRIC" | "BROWLINE" | null,
  "material": "TITANIUM" | "TR90" | "ACETATE" | "METAL" | "MIXED" | "PLASTIC" | null,
  "gender": "MALE" | "FEMALE" | "UNISEX" | null,
  "color": string | null,
  "style": "classic" | "modern" | "retro" | "sporty" | "luxury" | null
}
Chỉ trả về JSON, không giải thích.`;

// POST /api/ai/visual-search — search products by image with real OpenAI Vision
export async function POST(req: NextRequest) {
    const formData = await req.formData();
    const image = formData.get('image') as File | null;
    const description = formData.get('description') as string | null;

    if (!image && !description) {
        return NextResponse.json({ error: 'Image or description required' }, { status: 400 });
    }

    let features: Record<string, string | null> = {};

    if (image) {
        try {
            // Convert image to base64
            const bytes = await image.arrayBuffer();
            const base64 = Buffer.from(bytes).toString('base64');

            // Analyze with OpenAI Vision
            const result = await visionAnalysis(base64, VISION_PROMPT);

            // Parse JSON from response
            const jsonMatch = result.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                features = JSON.parse(jsonMatch[0]);
            }
        } catch {
            // Fallback to description-based analysis
            if (description) {
                features = analyzeDescription(description);
            }
        }
    } else if (description) {
        features = analyzeDescription(description);
    }

    // Query products based on detected features
    const where: Record<string, unknown> = { status: 'ACTIVE' };
    if (features.frameShape) where.frameShape = features.frameShape;
    if (features.material) where.material = features.material;
    if (features.gender) where.gender = features.gender;

    const products = await db.product.findMany({
        where,
        include: {
            variants: { where: { isActive: true }, orderBy: { price: 'asc' }, take: 1 },
            media: { take: 1, orderBy: { sort: 'asc' } },
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
    });

    // Calculate match scores based on matching features
    const featureCount = Object.values(features).filter(Boolean).length || 1;

    return NextResponse.json({
        features,
        results: products.map((p) => {
            let matchScore = 50;
            if (features.frameShape && p.frameShape === features.frameShape) matchScore += 25;
            if (features.material && p.material === features.material) matchScore += 15;
            if (features.gender && p.gender === features.gender) matchScore += 10;
            matchScore = Math.min(99, matchScore);

            return {
                id: p.id,
                slug: p.slug,
                name: p.name,
                brand: p.brand,
                frameShape: p.frameShape,
                material: p.material,
                imageUrl: p.media[0]?.url || null,
                price: p.variants[0]?.price || 0,
                compareAtPrice: p.variants[0]?.compareAtPrice || null,
                matchScore,
            };
        }).sort((a, b) => b.matchScore - a.matchScore),
    });
}

function analyzeDescription(desc: string): Record<string, string | null> {
    const d = desc.toLowerCase();
    const features: Record<string, string | null> = {};

    if (d.includes('aviator') || d.includes('giọt nước')) features.frameShape = 'AVIATOR';
    else if (d.includes('cat') || d.includes('mắt mèo')) features.frameShape = 'CAT_EYE';
    else if (d.includes('tròn') || d.includes('round')) features.frameShape = 'ROUND';
    else if (d.includes('vuông') || d.includes('square')) features.frameShape = 'SQUARE';
    else if (d.includes('oval')) features.frameShape = 'OVAL';

    if (d.includes('kim loại') || d.includes('metal')) features.material = 'METAL';
    else if (d.includes('acetate') || d.includes('nhựa')) features.material = 'ACETATE';
    else if (d.includes('titanium')) features.material = 'TITANIUM';

    if (d.includes('nam') || d.includes('men')) features.gender = 'MALE';
    else if (d.includes('nữ') || d.includes('women')) features.gender = 'FEMALE';

    return features;
}
