import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    const { slug } = await params;
    const product = await platformDb.product.findUnique({ where: { slug } });
    if (!product || !product.isActive) {
        return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 404 });
    }
    return NextResponse.json({ product });
}
