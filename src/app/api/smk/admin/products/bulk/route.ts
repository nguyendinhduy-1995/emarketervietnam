import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

/* ═══ POST /api/smk/admin/products/bulk — Import CSV ═══ */
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    try {
        const body = await req.json();
        const { rows } = body; // Array of { name, brand, category, sku, frameColor, lensColor, price, compareAtPrice, stockQty, tags, frameShape, material, gender }

        if (!rows?.length) {
            return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
        }

        const results: { created: number; updated: number; errors: string[] } = { created: 0, updated: 0, errors: [] };

        for (const row of rows) {
            try {
                if (!row.name?.trim()) { results.errors.push(`Row missing name: ${JSON.stringify(row).slice(0, 50)}`); continue; }

                // Check if product exists (by SKU match on variants)
                let existingProduct = null;
                if (row.sku) {
                    const variant = await db.productVariant.findUnique({ where: { sku: row.sku }, include: { product: true } });
                    if (variant) existingProduct = variant.product;
                }

                if (existingProduct) {
                    // Update existing product
                    await db.product.update({
                        where: { id: existingProduct.id },
                        data: {
                            name: row.name?.trim() || existingProduct.name,
                            brand: row.brand || existingProduct.brand,
                            category: row.category || existingProduct.category,
                            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : undefined,
                            frameShape: row.frameShape || undefined,
                            material: row.material || undefined,
                            gender: row.gender || undefined,
                        },
                    });

                    // Update variant
                    if (row.sku) {
                        await db.productVariant.update({
                            where: { sku: row.sku },
                            data: {
                                frameColor: row.frameColor || undefined,
                                lensColor: row.lensColor || undefined,
                                price: row.price ? parseInt(row.price) : undefined,
                                compareAtPrice: row.compareAtPrice ? parseInt(row.compareAtPrice) : undefined,
                                stockQty: row.stockQty !== undefined ? parseInt(row.stockQty) : undefined,
                            },
                        });
                    }
                    results.updated++;
                } else {
                    // Create new product
                    const baseSlug = row.name.trim().toLowerCase()
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                        .replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                    let slug = baseSlug;
                    let counter = 1;
                    while (await db.product.findUnique({ where: { slug } })) {
                        slug = `${baseSlug}-${counter++}`;
                    }

                    const sku = row.sku || `${(row.brand || 'SMK').substring(0, 3).toUpperCase()}-${slug.substring(0, 6).toUpperCase()}-${Date.now().toString(36)}`;

                    await db.product.create({
                        data: {
                            name: row.name.trim(), slug,
                            brand: row.brand || null,
                            category: row.category || null,
                            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
                            frameShape: row.frameShape || null,
                            material: row.material || null,
                            gender: row.gender || null,
                            status: 'DRAFT',
                            variants: {
                                create: [{
                                    sku,
                                    frameColor: row.frameColor || 'Default',
                                    lensColor: row.lensColor || null,
                                    price: parseInt(row.price) || 0,
                                    compareAtPrice: row.compareAtPrice ? parseInt(row.compareAtPrice) : null,
                                    stockQty: parseInt(row.stockQty) || 0,
                                }],
                            },
                        },
                    });
                    results.created++;
                }
            } catch (e) {
                results.errors.push(`Row "${row.name || row.sku}": ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        }

        return NextResponse.json(results);
    } catch (e) {
        console.error('[POST /api/smk/admin/products/bulk]', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}

/* ═══ GET /api/smk/admin/products/bulk — Export CSV ═══ */
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    try {
        const products = await db.product.findMany({
            include: {
                variants: { select: { sku: true, frameColor: true, lensColor: true, price: true, compareAtPrice: true, stockQty: true, reservedQty: true } },
            },
            orderBy: { name: 'asc' },
        });

        const header = 'Name,Brand,Category,SKU,FrameColor,LensColor,Price,CompareAtPrice,StockQty,ReservedQty,Tags,Status,FrameShape,Material,Gender\n';
        const rows = products.flatMap((p: typeof products[number]) =>
            p.variants.map((v: typeof p.variants[number]) =>
                [p.name, p.brand || '', p.category || '', v.sku, v.frameColor, v.lensColor || '',
                v.price, v.compareAtPrice || '', v.stockQty, v.reservedQty,
                (p.tags || []).join(';'), p.status, p.frameShape || '', p.material || '', p.gender || '',
                ].map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
            )
        ).join('\n');

        return new NextResponse(header + rows, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename=products-${new Date().toISOString().slice(0, 10)}.csv`,
            },
        });
    } catch (e) {
        console.error('[GET /api/smk/admin/products/bulk]', e);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }
}
