import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole, getWorkspaceFromRequest } from '@/lib/auth/emk-guard';
import { requireEntitlement } from '@/lib/auth/entitlement-guard';
import { logAdminAction } from '@/lib/audit';
import type { TokenPayload } from '@/lib/auth/jwt';

/**
 * CRM Route Context — returned by requireCrmAuth.
 * Every CRM route should use this for tenant-scoped queries.
 */
export interface CrmContext {
    user: TokenPayload;
    emkRole: string;
    workspaceId: string | null;
    /** Build a Prisma WHERE clause scoped to the current workspace */
    tenantWhere: (extra?: Record<string, unknown>) => Record<string, unknown>;
    /** Log an admin action with workspace context */
    audit: (params: {
        action: string;
        resource: string;
        resourceId: string;
        before?: unknown;
        after?: unknown;
        reason?: string;
    }) => Promise<void>;
}

/**
 * Universal CRM auth + tenant scoping.
 * Usage:
 *   const ctx = await requireCrmAuth(req);
 *   if (ctx instanceof NextResponse) return ctx;
 *   const data = await db.someModel.findMany({ where: ctx.tenantWhere({ status: 'ACTIVE' }) });
 */
export async function requireCrmAuth(
    req: NextRequest,
    options?: {
        /** Feature key to gate (e.g., 'AUTOMATION') */
        featureKey?: string;
        /** Allowed CRM roles (default: all) */
        allowedRoles?: string[];
    }
): Promise<CrmContext | NextResponse> {
    const auth = await requireEmkRole(req, options?.allowedRoles);
    if (auth instanceof NextResponse) return auth;

    const workspaceId = getWorkspaceFromRequest(req, auth.user);

    // Feature gating (if specified)
    if (options?.featureKey && workspaceId) {
        const gate = await requireEntitlement(workspaceId, options.featureKey);
        if (gate instanceof NextResponse) return gate;
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null;

    return {
        user: auth.user,
        emkRole: auth.emkRole,
        workspaceId,
        tenantWhere(extra?: Record<string, unknown>) {
            const where: Record<string, unknown> = { ...extra };
            // Scope to workspace when available
            if (workspaceId) {
                where.workspaceId = workspaceId;
            }
            return where;
        },
        async audit(params) {
            await logAdminAction({
                actorUserId: auth.user.userId,
                actorName: auth.user.name,
                workspaceId,
                ip,
                ...params,
            });
        },
    };
}

/**
 * Build a where clause filtering users belonging to the workspace.
 * Useful for routes that query by userId but need tenant isolation.
 */
export async function getTenantUserIds(
    workspaceId: string | null,
    db: { membership: { findMany: (args: { where: Record<string, unknown>; select: Record<string, boolean> }) => Promise<{ userId: string }[]> } }
): Promise<string[] | null> {
    if (!workspaceId) return null;
    const members = await db.membership.findMany({
        where: { workspaceId },
        select: { userId: true },
    });
    return members.map(m => m.userId);
}
