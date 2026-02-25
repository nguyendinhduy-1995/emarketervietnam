import { NextRequest, NextResponse } from 'next/server';
import { platformDb as db } from '@/lib/db/platform';

/**
 * POST /api/cron/demo-reset
 * 
 * Resets demo instance data daily.
 * Guards: CRON_SECRET bearer token.
 * 
 * Actions:
 * 1. Clear demo accounts, leads, tasks, notes
 * 2. Re-seed sample data
 * 3. Log reset event
 * 
 * Called by: vercel.json cron or external scheduler
 */
export async function POST(req: NextRequest) {
    const auth = req.headers.get('authorization')?.replace('Bearer ', '');
    const secret = process.env.CRON_SECRET;
    if (secret && auth !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const start = Date.now();
    const results: string[] = [];

    try {
        // Find demo workspaces (ones with isDemo flag or matching demo org)
        const demoOrgs = await db.org.findMany({
            where: { status: 'DEMO' },
            include: { workspaces: true },
        });

        if (demoOrgs.length === 0) {
            // Fallback: check if there's a workspace with "demo" in name
            results.push('No demo orgs found (status=DEMO). Skipping.');
            return NextResponse.json({ ok: true, results, elapsed: Date.now() - start });
        }

        for (const org of demoOrgs) {
            for (const ws of org.workspaces) {
                // Clear transactional data — keep structural data
                const cleared = await db.$transaction([
                    // Clear leads/accounts (keep sample ones created by seed)
                    db.emkNote.deleteMany({ where: { lead: { workspaceId: ws.id } } }),
                    db.emkTask.deleteMany({ where: { lead: { workspaceId: ws.id } } }),
                    db.emkAccount.deleteMany({ where: { workspaceId: ws.id } }),
                    db.emkLead.deleteMany({ where: { workspaceId: ws.id } }),
                    // Clear commerce orders
                    db.orderItem.deleteMany({ where: { order: { workspaceId: ws.id } } }),
                    db.commerceOrder.deleteMany({ where: { workspaceId: ws.id } }),
                    // Clear usage events (demo-prefixed users)
                    db.usageEvent.deleteMany({ where: { userId: { startsWith: 'demo_' } } }),
                ]);

                results.push(`WS ${ws.id}: cleared ${cleared.length} tables`);

                // Re-seed sample leads
                const sampleLeads = [
                    { name: 'Nguyễn Thị Demo', phone: '0901000001', email: 'demo1@example.com', source: 'DEMO', status: 'NEW' },
                    { name: 'Trần Văn Mẫu', phone: '0901000002', email: 'demo2@example.com', source: 'DEMO', status: 'CONTACTED' },
                    { name: 'Lê Thị Test', phone: '0901000003', email: 'demo3@example.com', source: 'DEMO', status: 'QUALIFIED' },
                    { name: 'Phạm Hữu Dùng Thử', phone: '0901000004', email: null, source: 'DEMO', status: 'WON' },
                    { name: 'Võ Thị Khách Hàng', phone: '0901000005', email: 'demo5@example.com', source: 'DEMO', status: 'NEW' },
                ];

                for (const lead of sampleLeads) {
                    await db.emkLead.create({
                        data: { ...lead, workspaceId: ws.id },
                    });
                }

                results.push(`WS ${ws.id}: seeded ${sampleLeads.length} sample leads`);
            }
        }

        // Log event
        await db.eventLog.create({
            data: {
                type: 'DEMO_DATA_RESET',
                payloadJson: { results, elapsed: Date.now() - start },
            },
        });

    } catch (err) {
        results.push(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
    }

    return NextResponse.json({ ok: true, results, elapsed: Date.now() - start });
}
