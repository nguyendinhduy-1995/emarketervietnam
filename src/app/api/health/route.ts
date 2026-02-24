import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

// GET /api/health — System health check for monitoring
export async function GET() {
    const checks: Record<string, { ok: boolean; latency?: number; error?: string }> = {};

    // 1. Database connectivity
    const dbStart = Date.now();
    try {
        await platformDb.$queryRaw`SELECT 1`;
        checks.database = { ok: true, latency: Date.now() - dbStart };
    } catch (e) {
        checks.database = { ok: false, latency: Date.now() - dbStart, error: String(e) };
    }

    // 2. Memory usage
    const mem = process.memoryUsage();
    const memMB = Math.round(mem.heapUsed / 1024 / 1024);
    checks.memory = { ok: memMB < 512, latency: memMB };

    // 3. Environment vars check
    const requiredEnvs = ['DATABASE_URL', 'JWT_SECRET', 'CRON_SECRET'];
    const missingEnvs = requiredEnvs.filter(k => !process.env[k]);
    checks.environment = {
        ok: missingEnvs.length === 0,
        error: missingEnvs.length > 0 ? `Missing: ${missingEnvs.join(', ')}` : undefined,
    };

    // Overall status
    const allOk = Object.values(checks).every(c => c.ok);

    return NextResponse.json({
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        checks,
    }, { status: allOk ? 200 : 503 });
}
