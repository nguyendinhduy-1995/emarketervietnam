import { NextResponse } from 'next/server';
import { readdir, stat, unlink } from 'fs/promises';
import path from 'path';

const RESULTS_DIR = path.join(process.cwd(), 'public', 'try-on-results');
const MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// GET /api/try-on/cleanup — called by cron
export async function GET() {
    try {
        const files = await readdir(RESULTS_DIR).catch(() => [] as string[]);
        const now = Date.now();
        let deleted = 0;

        for (const file of files) {
            const filepath = path.join(RESULTS_DIR, file);
            const info = await stat(filepath);
            if (now - info.mtimeMs > MAX_AGE_MS) {
                await unlink(filepath);
                deleted++;
            }
        }

        return NextResponse.json({
            success: true,
            deleted,
            remaining: files.length - deleted,
        });
    } catch (error: unknown) {
        console.error('Cleanup error:', error);
        return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
    }
}
