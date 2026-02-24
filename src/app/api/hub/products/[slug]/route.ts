import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const product = await platformDb.product.findUnique({
        where: { slug },
        include: {
            meteredItems: { where: { isActive: true }, orderBy: { unitPrice: 'asc' } },
            digitalAssets: { where: { isActive: true } },
            plans: true,
        },
    });
    if (!product || !product.isActive || product.status !== 'PUBLISHED') {
        return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    }

    // Parse JSON string fields (features, faq) — they may be stored as strings
    const parsed = {
        ...product,
        features: typeof product.features === 'string' ? JSON.parse(product.features) : (product.features || []),
        faq: typeof product.faq === 'string' ? JSON.parse(product.faq) : (product.faq || []),
    };

    return NextResponse.json({ product: parsed });
}
