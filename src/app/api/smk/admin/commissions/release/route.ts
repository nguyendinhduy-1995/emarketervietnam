import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

// POST /api/smk/admin/commissions/release — auto-release held commissions
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'orders');
    if (authError) return authError;

    const now = new Date();

    // Find commissions past hold period
    const releasable = await db.commission.findMany({
        where: {
            status: 'PENDING',
            holdUntil: { lte: now },
        },
        include: {
            order: { select: { status: true } },
        },
    });

    let released = 0;
    let reversed = 0;

    for (const comm of releasable) {
        // Only release if order is delivered (not returned/cancelled)
        if (comm.order.status === 'DELIVERED') {
            await db.$transaction(async (tx: Parameters<Parameters<typeof db.$transaction>[0]>[0]) => {
                await tx.commission.update({
                    where: { id: comm.id },
                    data: { status: 'AVAILABLE' },
                });

                // Add to wallet
                const walletBalance = await tx.partnerWalletTx.aggregate({
                    where: { partnerId: comm.partnerId },
                    _sum: { amount: true },
                });

                await tx.partnerWalletTx.create({
                    data: {
                        partnerId: comm.partnerId,
                        type: 'COMMISSION',
                        amount: comm.amount,
                        refId: comm.id,
                        balanceAfter: (walletBalance._sum.amount || 0) + comm.amount,
                    },
                });

                await tx.eventLog.create({
                    data: {
                        type: 'COMMISSION_AVAILABLE',
                        partnerId: comm.partnerId,
                        orderId: comm.orderId,
                        payload: { amount: comm.amount },
                    },
                });
            });
            released++;
        } else if (['RETURNED', 'CANCELLED'].includes(comm.order.status)) {
            await db.commission.update({
                where: { id: comm.id },
                data: { status: 'REVERSED' },
            });
            reversed++;
        }
    }

    // Leader tier upgrade check
    const tierResults = await checkLeaderTierUpgrades();

    return NextResponse.json({
        processedTotal: releasable.length,
        released,
        reversed,
        tierUpgrades: tierResults,
    });
}

async function checkLeaderTierUpgrades() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Tier thresholds
    const TIERS = {
        AGENT: { minRevenue: 10000000, minOrders: 10 },   // 10M + 10 orders
        LEADER: { minRevenue: 50000000, minOrders: 50 },   // 50M + 50 orders
    };

    const partners = await db.partnerProfile.findMany({
        where: { status: 'ACTIVE', level: { in: ['AFFILIATE', 'AGENT'] } },
        select: { id: true, level: true, partnerCode: true },
    });

    const upgrades: { partnerCode: string; from: string; to: string }[] = [];

    for (const partner of partners) {
        // Calculate 30-day referred revenue
        const referrals = await db.orderReferral.findMany({
            where: {
                partnerId: partner.id,
                order: { createdAt: { gte: thirtyDaysAgo }, status: { in: ['DELIVERED', 'SHIPPING'] } },
            },
            include: { order: { select: { total: true } } },
        });

        const revenue = referrals.reduce((sum, r) => sum + r.order.total, 0);
        const orderCount = referrals.length;

        let newLevel: string | null = null;

        if (partner.level === 'AFFILIATE' &&
            revenue >= TIERS.AGENT.minRevenue &&
            orderCount >= TIERS.AGENT.minOrders) {
            newLevel = 'AGENT';
        } else if (partner.level === 'AGENT' &&
            revenue >= TIERS.LEADER.minRevenue &&
            orderCount >= TIERS.LEADER.minOrders) {
            newLevel = 'LEADER';
        }

        if (newLevel) {
            await db.partnerProfile.update({
                where: { id: partner.id },
                data: { level: newLevel as 'AFFILIATE' | 'AGENT' | 'LEADER' },
            });

            await db.eventLog.create({
                data: {
                    type: 'PARTNER_APPROVED', // reuse type for tier upgrade
                    partnerId: partner.id,
                    payload: { action: 'tier_upgrade', from: partner.level, to: newLevel, revenue, orderCount },
                },
            });

            upgrades.push({ partnerCode: partner.partnerCode, from: partner.level, to: newLevel });
        }
    }

    return upgrades;
}
