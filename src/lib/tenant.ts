import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';

/**
 * Resolve tenant from spaSlug → workspaceId.
 * Returns workspace if valid, or null.
 */
export async function resolveTenant(spaSlug: string) {
    const workspace = await platformDb.workspace.findUnique({
        where: { slug: spaSlug },
        include: {
            subscriptions: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
    });

    if (!workspace) return null;
    if (workspace.status === 'SUSPENDED') return null;

    return workspace;
}

/**
 * Middleware helper for CRM API routes.
 * Returns workspaceId or error response.
 */
export async function requireTenant(
    spaSlug: string
): Promise<{ workspaceId: string } | NextResponse> {
    const workspace = await resolveTenant(spaSlug);
    if (!workspace) {
        return NextResponse.json(
            { error: 'Spa not found or suspended' },
            { status: 404 }
        );
    }
    return { workspaceId: workspace.id };
}
