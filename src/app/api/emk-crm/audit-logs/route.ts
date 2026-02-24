import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET /api/emk-crm/audit-logs — Query admin audit logs
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req, { allowedRoles: ['ADMIN'] });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');
    const actorUserId = searchParams.get('actorUserId');

    const where: Record<string, unknown> = {};
    if (action) where.action = action;
    if (resource) where.resource = resource;
    if (actorUserId) where.actorUserId = actorUserId;

    const [logs, total] = await Promise.all([
        platformDb.adminAuditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        platformDb.adminAuditLog.count({ where }),
    ]);

    return NextResponse.json({
        logs,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
}
