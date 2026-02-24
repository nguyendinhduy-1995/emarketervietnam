import { NextRequest, NextResponse } from 'next/server';
import { requireEmkRole } from '@/lib/auth/emk-guard';
import { platformDb } from '@/lib/db/platform';

// GET – Admin: xem tất cả wallets
export async function GET(req: NextRequest) {
    const auth = await requireEmkRole(req);
    if (auth instanceof NextResponse) return auth;

    const allWallets = await platformDb.wallet.findMany({
        include: {
            user: { select: { name: true, phone: true } },
            _count: { select: { ledger: true } },
        },
        orderBy: { balanceAvailable: 'desc' },
    });

    const wallets = allWallets.map((w) => ({
        userId: w.userId,
        userName: w.user.name,
        userPhone: w.user.phone,
        balance: w.balanceAvailable,
        txCount: w._count.ledger,
        lastActivity: w.updatedAt,
    }));

    return NextResponse.json({ wallets });
}
