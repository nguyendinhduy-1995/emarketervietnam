import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);

    // Get all modules
    const modules = await platformDb.module.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    // Get workspace entitlements
    let entitlements: Record<string, string> = {};
    if (workspaceId) {
        const ents = await platformDb.entitlement.findMany({
            where: { workspaceId },
        });
        entitlements = Object.fromEntries(
            ents.map((e) => [e.moduleKey, e.status])
        );
    }

    return NextResponse.json({
        modules: modules.map((m) => ({
            ...m,
            entitlementStatus: entitlements[m.key] || null,
        })),
    });
}
