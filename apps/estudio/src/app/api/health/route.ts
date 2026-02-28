import { NextResponse } from 'next/server';

/**
 * GET /api/health — Hub health check endpoint
 */
export async function GET() {
    try {
        return NextResponse.json({
            ok: true,
            app: 'eStudio',
            version: process.env.npm_package_version || '1.0.0',
            uptime: process.uptime(),
            workspaceId: process.env.WORKSPACE_ID || 'unknown',
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({ ok: false }, { status: 503 });
    }
}
