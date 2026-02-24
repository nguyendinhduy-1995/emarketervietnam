import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';
import { requireEmkRole } from '@/lib/auth/emk-guard';

// GET — list digital assets for a product
export async function GET(req: NextRequest) {
    const productId = new URL(req.url).searchParams.get('productId');

    const assets = await db.digitalAsset.findMany({
        where: productId ? { productId } : {},
        orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(assets);
}

// POST — create digital asset record (file upload handled separately)
export async function POST(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const { productId, fileKey, filename, size, checksum, version } = await req.json();
    if (!productId || !fileKey || !filename) {
        return NextResponse.json({ error: 'productId, fileKey, filename là bắt buộc' }, { status: 400 });
    }

    const asset = await db.digitalAsset.create({
        data: {
            productId, fileKey, filename,
            size: size || 0,
            checksum: checksum || null,
            version: version || '1.0',
        },
    });
    return NextResponse.json(asset, { status: 201 });
}

// DELETE — delete digital asset
export async function DELETE(req: NextRequest) {
    const auth = await requireEmkRole(req, ['ADMIN']);
    if (auth instanceof NextResponse) return auth;

    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.digitalAsset.delete({ where: { id } });
    return NextResponse.json({ ok: true });
}
