import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db/smk';

// ─── Vietnamese typo / synonym dictionary ─────────────────
const SYNONYMS: Record<string, string[]> = {
    'kính râm': ['kinh ram', 'kinh mat', 'kính mát', 'sunglasses', 'sun glasses'],
    'kính cận': ['kinh can', 'kính cần', 'kinh cận', 'glasses', 'prescription'],
    'gọng kính': ['gong kinh', 'gọng', 'khung kính', 'khung kinh', 'frame'],
    'tròng kính': ['trong kinh', 'tròng', 'mắt kính', 'mat kinh', 'lens'],
    'aviator': ['phi công', 'phi cong'],
    'cat eye': ['mắt mèo', 'mat meo', 'cateye'],
    'vuông': ['square', 'vuong'],
    'tròn': ['round', 'tron'],
    'oval': ['bầu dục', 'bau duc'],
    'browline': ['nửa gọng', 'nua gong'],
    'titanium': ['titan', 'ti tan'],
    'acetate': ['nhựa dẻo', 'nhua deo'],
    'ray-ban': ['rayban', 'ray ban'],
    'ray ban': ['rayban', 'ray-ban'],
    'tom ford': ['tomford'],
    'oakley': ['ok ley', 'okley'],
};

// Common typo patterns in Vietnamese
const TYPO_FIXES: Record<string, string> = {
    'kinh': 'kính', 'kin': 'kính', 'kíh': 'kính',
    'ram': 'râm', 'ran': 'râm',
    'can': 'cận', 'cần': 'cận',
    'gong': 'gọng', 'gọg': 'gọng',
    'trong': 'tròng',
    'mat': 'mắt', 'mắ': 'mắt',
    'nam': 'nam', 'nu': 'nữ',
    'sunglases': 'sunglasses', 'sunglass': 'sunglasses',
    'glasess': 'glasses', 'glases': 'glasses',
};

function normalizeQuery(raw: string): string[] {
    const q = raw.toLowerCase().trim();
    const queries: string[] = [q];

    // Fix typos word by word
    const words = q.split(/\s+/);
    const fixed = words.map(w => TYPO_FIXES[w] || w).join(' ');
    if (fixed !== q) queries.push(fixed);

    // Expand synonyms
    for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
        if (aliases.some(a => q.includes(a)) || q.includes(canonical)) {
            if (!queries.includes(canonical)) queries.push(canonical);
            // Also add individual canonical words for broader match
            canonical.split(' ').forEach(w => { if (w.length > 2 && !queries.includes(w)) queries.push(w); });
        }
    }

    return [...new Set(queries)];
}

// GET /api/search?q=keyword — smart search with typo/synonym
export async function GET(req: NextRequest) {
    const raw = req.nextUrl.searchParams.get('q')?.trim();

    if (!raw || raw.length < 2) {
        return NextResponse.json({ results: [], corrected: null });
    }

    const queries = normalizeQuery(raw);
    const corrected = queries.length > 1 && queries[1] !== raw.toLowerCase() ? queries[1] : null;

    try {
        const orConditions = queries.flatMap(q => [
            { name: { contains: q, mode: 'insensitive' as const } },
            { brand: { contains: q, mode: 'insensitive' as const } },
            { tags: { has: q } },
            { description: { contains: q, mode: 'insensitive' as const } },
        ]);

        const products = await db.product.findMany({
            where: {
                status: 'ACTIVE',
                OR: orConditions,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                brand: true,
                frameShape: true,
                media: { take: 1, orderBy: { sort: 'asc' }, select: { url: true } },
                variants: {
                    where: { isActive: true },
                    orderBy: [{ stockQty: 'desc' }, { price: 'asc' }], // Boost in-stock first
                    take: 1,
                    select: { price: true, compareAtPrice: true, stockQty: true },
                },
            },
            take: 20,
        });

        // Score & sort: in-stock first, then by name match quality
        const scored = products.map((p) => {
            let score = 0;
            const q0 = queries[0];
            if (p.name.toLowerCase().includes(q0)) score += 10;
            if (p.brand?.toLowerCase().includes(q0)) score += 5;
            if ((p.variants[0]?.stockQty || 0) > 0) score += 3; // Boost in-stock
            if (p.variants[0]?.compareAtPrice) score += 1; // Boost on-sale
            return { ...p, score };
        });
        scored.sort((a, b) => b.score - a.score);

        const results = scored.slice(0, 10).map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand,
            frameShape: p.frameShape,
            imageUrl: p.media[0]?.url || null,
            price: p.variants[0]?.price || 0,
            compareAtPrice: p.variants[0]?.compareAtPrice || null,
            inStock: (p.variants[0]?.stockQty || 0) > 0,
        }));

        return NextResponse.json({ results, corrected });
    } catch {
        // DB unavailable — return empty
        return NextResponse.json({ results: [], corrected });
    }
}
