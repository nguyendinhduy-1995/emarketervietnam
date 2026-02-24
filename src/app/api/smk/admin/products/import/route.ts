import { NextResponse, NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) return NextResponse.json({ error: 'CSV phải có ít nhất header + 1 dòng dữ liệu' }, { status: 400 });

        const header = lines[0].split(',').map(h => h.trim().toLowerCase());
        const required = ['name', 'price'];
        const missing = required.filter(r => !header.includes(r));
        if (missing.length > 0) return NextResponse.json({ error: `CSV thiếu cột: ${missing.join(', ')}` }, { status: 400 });

        // Parse CSV to products
        const products = [];
        const errors: string[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const row: Record<string, string> = {};
            header.forEach((h, j) => { row[h] = values[j] || ''; });

            const name = row['name'];
            const price = parseFloat(row['price']);

            if (!name) { errors.push(`Dòng ${i + 1}: Thiếu tên sản phẩm`); continue; }
            if (isNaN(price) || price <= 0) { errors.push(`Dòng ${i + 1}: Giá không hợp lệ`); continue; }

            const slug = name.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

            products.push({
                id: `csv-${Date.now()}-${i}`,
                name,
                slug: row['slug'] || slug,
                price,
                compareAt: row['compareat'] ? parseFloat(row['compareat']) : null,
                category: row['category'] || 'Kính mắt',
                brand: row['brand'] || null,
                description: row['description'] || '',
                image: row['image'] || null,
                images: row['images'] ? row['images'].split('|') : [],
                tags: row['tags'] ? row['tags'].split('|') : [],
                inStock: true,
                featured: false,
            });
        }

        // Add to existing products.json
        if (products.length > 0) {
            const productsPath = path.join(process.cwd(), 'src', 'data', 'products.json');
            try {
                const existing = JSON.parse(await readFile(productsPath, 'utf-8'));
                const merged = [...existing, ...products];
                await writeFile(productsPath, JSON.stringify(merged, null, 2), 'utf-8');
            } catch {
                // If file doesn't exist, create it
                await writeFile(productsPath, JSON.stringify(products, null, 2), 'utf-8');
            }
        }

        return NextResponse.json({
            success: true,
            imported: products.length,
            errors: errors.length > 0 ? errors : undefined,
            total: products.length,
            message: `✅ Đã import ${products.length} sản phẩm${errors.length > 0 ? `. ⚠️ ${errors.length} dòng lỗi.` : ''}`,
        });
    } catch (err) {
        return NextResponse.json({ error: 'Lỗi xử lý file CSV' }, { status: 500 });
    }
}
