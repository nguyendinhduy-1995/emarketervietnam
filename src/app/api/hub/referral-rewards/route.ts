import { NextRequest, NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { getSession } from '@/lib/auth/jwt';

// Tier definitions
const TIERS = [
    { key: 'BRONZE', label: '🥉 Bronze', minReferrals: 0, commissionRate: 10, creditPerReferral: 50000 },
    { key: 'SILVER', label: '🥈 Silver', minReferrals: 5, commissionRate: 15, creditPerReferral: 75000 },
    { key: 'GOLD', label: '🥇 Gold', minReferrals: 15, commissionRate: 20, creditPerReferral: 100000 },
    { key: 'PLATINUM', label: '💎 Platinum', minReferrals: 30, commissionRate: 25, creditPerReferral: 150000 },
];

function getTier(referralCount: number) {
    let current = TIERS[0];
    for (const tier of TIERS) {
        if (referralCount >= tier.minReferrals) current = tier;
    }
    return current;
}

function getNextTier(referralCount: number) {
    for (const tier of TIERS) {
        if (referralCount < tier.minReferrals) return tier;
    }
    return null;
}

// ═══════ GET — Get referral stats + tier info ═══════
export async function GET() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;

    // Get affiliate account for this user (via email match)
    const user = await platformDb.user.findUnique({ where: { id: userId }, select: { email: true, name: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get all referrals
    const affiliates = await platformDb.affiliateAccount.findMany({
        where: { email: user.email },
        include: {
            referrals: { orderBy: { createdAt: 'desc' } },
            commissions: { orderBy: { createdAt: 'desc' } },
        },
    });

    const totalReferrals = affiliates.reduce((acc: number, a: { referrals: unknown[] }) => acc + a.referrals.length, 0);
    const paidReferrals = affiliates.reduce((acc: number, a: { referrals: { status: string }[] }) =>
        acc + a.referrals.filter((r: { status: string }) => r.status === 'PAID').length, 0);
    const totalCommission = affiliates.reduce((acc: number, a: { commissions: { amount: number }[] }) =>
        acc + a.commissions.reduce((sum: number, c: { amount: number }) => sum + c.amount, 0), 0);

    const currentTier = getTier(totalReferrals);
    const nextTier = getNextTier(totalReferrals);

    // Get wallet
    const wallet = await platformDb.wallet.findUnique({ where: { userId } });

    return NextResponse.json({
        tiers: TIERS,
        currentTier,
        nextTier,
        progress: nextTier ? { current: totalReferrals, target: nextTier.minReferrals, pct: Math.round((totalReferrals / nextTier.minReferrals) * 100) } : { current: totalReferrals, target: totalReferrals, pct: 100 },
        stats: {
            totalReferrals,
            paidReferrals,
            totalCommission,
            walletBalance: wallet?.balanceAvailable || 0,
        },
        recentReferrals: affiliates.flatMap((a: { referrals: { id: string; status: string; createdAt: Date; convertedAt: Date | null }[] }) =>
            a.referrals.map((r: { id: string; status: string; createdAt: Date; convertedAt: Date | null }) => ({
                id: r.id, status: r.status, createdAt: r.createdAt, convertedAt: r.convertedAt,
            }))
        ).slice(0, 20),
    });
}

// ═══════ POST — Claim referral credit to wallet ═══════
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const userId = session.userId;
    const { referralId } = await req.json();
    if (!referralId) return NextResponse.json({ error: 'referralId required' }, { status: 400 });

    // Check referral exists and is PAID status
    const referral = await platformDb.referral.findUnique({
        where: { id: referralId },
        include: { affiliate: true },
    });
    if (!referral || referral.status !== 'PAID') {
        return NextResponse.json({ error: 'Referral not eligible for reward' }, { status: 400 });
    }

    // Get or create wallet
    let wallet = await platformDb.wallet.findUnique({ where: { userId } });
    if (!wallet) {
        wallet = await platformDb.wallet.create({ data: { userId, balanceAvailable: 0 } });
    }

    // Calculate credit amount based on tier
    const allReferrals = await platformDb.referral.count({ where: { affiliateId: referral.affiliateId } });
    const tier = getTier(allReferrals);
    const creditAmount = tier.creditPerReferral;

    // Check if already claimed (idempotency)
    const existing = await platformDb.walletLedger.findFirst({
        where: { userId, refType: 'REFERRAL_REWARD', refId: referralId },
    });
    if (existing) return NextResponse.json({ error: 'Already claimed' }, { status: 400 });

    // Credit wallet
    await platformDb.walletLedger.create({
        data: {
            walletId: wallet.id,
            userId,
            type: 'TOPUP',
            amount: creditAmount,
            direction: 'CREDIT',
            refType: 'REFERRAL_REWARD',
            refId: referralId,
            idempotencyKey: `ref-reward-${referralId}`,
            note: `Referral reward (${tier.label})`,
        },
    });

    // Update wallet balance
    await platformDb.wallet.update({
        where: { id: wallet.id },
        data: { balanceAvailable: { increment: creditAmount } },
    });

    return NextResponse.json({ message: 'Reward claimed', amount: creditAmount, tier: tier.label });
}
