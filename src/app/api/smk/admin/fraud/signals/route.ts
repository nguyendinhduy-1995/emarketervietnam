import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// GET /api/smk/admin/fraud/signals — fraud risk overview
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const signals = await db.partnerRiskSignal.findMany({
        where: { flaggedScore: { gte: 40 } },
        include: {
            partner: {
                select: { partnerCode: true, level: true, status: true, user: { select: { name: true } } },
            },
        },
        orderBy: { flaggedScore: 'desc' },
    });

    return NextResponse.json({ signals });
}

// POST /api/smk/admin/fraud/signals — refresh/recalculate fraud signals for all partners
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const partners = await db.partnerProfile.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    for (const partner of partners) {
        // Gather stats
        const [totalOrders, returnedOrders, cancelledOrders] = await Promise.all([
            db.orderReferral.count({
                where: { partnerId: partner.id, order: { createdAt: { gte: thirtyDaysAgo } } },
            }),
            db.orderReferral.count({
                where: {
                    partnerId: partner.id,
                    order: { createdAt: { gte: thirtyDaysAgo }, status: 'RETURNED' },
                },
            }),
            db.orderReferral.count({
                where: {
                    partnerId: partner.id,
                    order: { createdAt: { gte: thirtyDaysAgo }, status: 'CANCELLED' },
                },
            }),
        ]);

        const returnRate = totalOrders > 0 ? Math.round((returnedOrders / totalOrders) * 100) : 0;
        const cancelRate = totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 100) : 0;

        // Calculate risk score
        let score = 0;
        if (returnRate > 25) score += 30;
        else if (returnRate > 15) score += 15;
        if (cancelRate > 20) score += 20;
        else if (cancelRate > 10) score += 10;

        // Upsert risk signal
        await db.partnerRiskSignal.upsert({
            where: { partnerId: partner.id },
            update: {
                returnRate30d: returnRate,
                cancelRate30d: cancelRate,
                flaggedScore: score,
                updatedAt: now,
            },
            create: {
                partnerId: partner.id,
                returnRate30d: returnRate,
                cancelRate30d: cancelRate,
                sameDeviceOrders: 0,
                sameAddressOrders: 0,
                suspiciousIpCount: 0,
                flaggedScore: score,
            },
        });
    }

    return NextResponse.json({ ok: true, processed: partners.length });
}
