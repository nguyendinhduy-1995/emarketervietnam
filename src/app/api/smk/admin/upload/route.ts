import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];

        if (!files.length) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'products');
        await mkdir(uploadDir, { recursive: true });

        const results: { url: string; type: 'IMAGE' | 'VIDEO'; name: string }[] = [];

        for (const file of files) {
            if (!allowedTypes.includes(file.type)) {
                return NextResponse.json(
                    { error: `File type not allowed: ${file.type}. Allowed: jpg, png, webp, mp4, mov` },
                    { status: 400 }
                );
            }

            if (file.size > maxSize) {
                return NextResponse.json(
                    { error: `File too large: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB). Max: 5MB` },
                    { status: 400 }
                );
            }

            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const filePath = path.join(uploadDir, uniqueName);

            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filePath, buffer);

            const isVideo = file.type.startsWith('video/');
            results.push({
                url: `/uploads/products/${uniqueName}`,
                type: isVideo ? 'VIDEO' : 'IMAGE',
                name: file.name,
            });
        }

        return NextResponse.json({ files: results });
    } catch (e) {
        console.error('[Upload]', e);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}
