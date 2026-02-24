import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const checks: Record<string, { ok: boolean; detail?: string }> = {};

    // DB check
    try {
        await platformDb.$queryRaw`SELECT 1`;
        checks.db = { ok: true, detail: 'PostgreSQL kết nối tốt' };
    } catch {
        checks.db = { ok: false, detail: 'Không kết nối được DB' };
    }

    // Redis check (soft – just check if env is set)
    checks.redis = {
        ok: !!process.env.REDIS_URL,
        detail: process.env.REDIS_URL ? 'Redis đã cấu hình' : 'Chưa cấu hình REDIS_URL',
    };

    // Last error
    const lastError = await platformDb.errorLog.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { message: true, createdAt: true, path: true },
    });
    checks.lastError = lastError
        ? { ok: false, detail: `${lastError.path || '?'}: ${lastError.message} (${new Date(lastError.createdAt).toLocaleString('vi-VN')})` }
        : { ok: true, detail: 'Không có lỗi' };

    // Last import
    const lastImport = await platformDb.importJob.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { status: true, successRows: true, totalRows: true, createdAt: true },
    });
    checks.lastImport = lastImport
        ? { ok: lastImport.status === 'DONE', detail: `${lastImport.successRows}/${lastImport.totalRows} dòng – ${new Date(lastImport.createdAt).toLocaleString('vi-VN')}` }
        : { ok: true, detail: 'Chưa có lần nhập nào' };

    // Last login
    const lastLogin = await platformDb.eventLog.findFirst({
        where: { type: 'LOGIN' },
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { name: true, email: true } } },
    });
    checks.lastLogin = lastLogin
        ? { ok: true, detail: `${lastLogin.actor?.name || lastLogin.actor?.email} – ${new Date(lastLogin.createdAt).toLocaleString('vi-VN')}` }
        : { ok: true, detail: 'Chưa ghi nhận' };

    return NextResponse.json({ checks });
}
