import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';
import { hashPassword } from '@/lib/auth/password';

async function logEvent(actorUserId: string, type: string, detail: string) {
    await platformDb.eventLog.create({
        data: { actorUserId, type, payloadJson: { detail } },
    });
}

// GET — list Hub users (non-admin, non-staff)
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const users = await platformDb.user.findMany({
        where: { isAdmin: false, emkRole: null },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, name: true, email: true, phone: true,
            status: true, createdAt: true, updatedAt: true,
            wallet: { select: { id: true, balanceAvailable: true } },
            memberships: {
                select: {
                    role: true,
                    workspace: { select: { id: true, name: true, slug: true, status: true } },
                },
            },
        },
    });

    const accounts = users.map(u => ({
        id: u.id, name: u.name, email: u.email, phone: u.phone,
        status: u.status, createdAt: u.createdAt, updatedAt: u.updatedAt,
        walletBalance: u.wallet?.balanceAvailable ?? 0,
        workspaces: u.memberships.map(m => ({
            id: m.workspace.id, name: m.workspace.name,
            slug: m.workspace.slug, status: m.workspace.status, role: m.role,
        })),
    }));

    return NextResponse.json({ accounts, total: accounts.length });
}

// POST — full admin actions on Hub users
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { action } = body;

    try {
        // ─── Create Hub user ───
        if (action === 'create') {
            const { name, phone, email, password } = body;
            if (!name || !phone || !password) {
                return NextResponse.json({ error: 'Tên, SĐT và mật khẩu là bắt buộc' }, { status: 400 });
            }
            const existing = await platformDb.user.findUnique({ where: { phone } });
            if (existing) {
                return NextResponse.json({ error: 'Số điện thoại đã tồn tại' }, { status: 400 });
            }
            const passwordHash = await hashPassword(password);
            const user = await platformDb.user.create({
                data: { name, phone, email: email || null, passwordHash, isAdmin: false, emkRole: null },
            });
            // Create wallet for Hub user
            await platformDb.wallet.create({ data: { userId: user.id } });
            await logEvent(auth.user.userId, 'HUB_USER_CREATED', `Tạo user Hub: ${name} (${phone})`);
            return NextResponse.json({ message: `Đã tạo user Hub: ${name}` });
        }

        // ─── Update Hub user info ───
        if (action === 'update') {
            const { userId, name, email, phone } = body;
            if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
            const data: Record<string, unknown> = {};
            if (name !== undefined) data.name = name;
            if (email !== undefined) data.email = email || null;
            if (phone !== undefined) data.phone = phone;
            const user = await platformDb.user.update({ where: { id: userId }, data });
            await logEvent(auth.user.userId, 'HUB_USER_UPDATED', `Cập nhật Hub user: ${user.name}`);
            return NextResponse.json({ message: `Đã cập nhật ${user.name}` });
        }

        // ─── Toggle status (ACTIVE ↔ DISABLED) ───
        if (action === 'toggle-status') {
            const { userId } = body;
            if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
            const user = await platformDb.user.findUnique({ where: { id: userId } });
            if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
            const newStatus = user.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
            await platformDb.user.update({ where: { id: userId }, data: { status: newStatus } });
            await logEvent(auth.user.userId, 'HUB_USER_STATUS', `${user.name}: ${user.status} → ${newStatus}`);
            return NextResponse.json({ message: `${user.name} → ${newStatus}` });
        }

        // ─── Reset password ───
        if (action === 'reset-password') {
            const { userId, password } = body;
            if (!userId || !password) return NextResponse.json({ error: 'Thiếu userId hoặc password' }, { status: 400 });
            const passwordHash = await hashPassword(password);
            const user = await platformDb.user.update({ where: { id: userId }, data: { passwordHash } });
            await logEvent(auth.user.userId, 'HUB_PASSWORD_RESET', `Reset mật khẩu Hub: ${user.name}`);
            return NextResponse.json({ message: `Đã reset mật khẩu cho ${user.name}` });
        }

        // ─── Delete user ───
        if (action === 'delete') {
            const { userId } = body;
            if (!userId) return NextResponse.json({ error: 'Thiếu userId' }, { status: 400 });
            const user = await platformDb.user.findUnique({ where: { id: userId } });
            if (!user) return NextResponse.json({ error: 'Không tìm thấy user' }, { status: 404 });
            await logEvent(auth.user.userId, 'HUB_USER_DELETED', `Xóa Hub user: ${user.name} (${user.phone})`);
            await platformDb.user.delete({ where: { id: userId } });
            return NextResponse.json({ message: `Đã xóa ${user.name}` });
        }

        // ─── Wallet adjust (CREDIT / DEBIT) ───
        if (action === 'wallet-adjust') {
            const { userId, amount, direction, reason } = body;
            if (!userId || !amount || !direction || !reason) {
                return NextResponse.json({ error: 'Thiếu thông tin (userId, amount, direction, reason)' }, { status: 400 });
            }
            if (!['CREDIT', 'DEBIT'].includes(direction)) {
                return NextResponse.json({ error: 'Direction phải là CREDIT hoặc DEBIT' }, { status: 400 });
            }
            if (amount <= 0) {
                return NextResponse.json({ error: 'Số tiền phải > 0' }, { status: 400 });
            }

            const result = await platformDb.$transaction(async (tx) => {
                let wallet = await tx.wallet.findUnique({ where: { userId } });
                if (!wallet) wallet = await tx.wallet.create({ data: { userId } });

                await tx.walletLedger.create({
                    data: {
                        walletId: wallet.id, userId,
                        type: 'ADJUST', amount, direction,
                        refType: 'MANUAL_ADJUST', refId: `admin-${auth.user.userId}`,
                        idempotencyKey: `ADJ:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        note: reason, metadata: { adjustedBy: auth.user.userId },
                    },
                });

                const credits = await tx.walletLedger.aggregate({
                    where: { walletId: wallet.id, direction: 'CREDIT' }, _sum: { amount: true },
                });
                const debits = await tx.walletLedger.aggregate({
                    where: { walletId: wallet.id, direction: 'DEBIT' }, _sum: { amount: true },
                });
                const newBalance = (credits._sum.amount || 0) - (debits._sum.amount || 0);
                await tx.wallet.update({ where: { id: wallet.id }, data: { balanceAvailable: newBalance } });
                return newBalance;
            });

            const user = await platformDb.user.findUnique({ where: { id: userId }, select: { name: true } });
            await logEvent(auth.user.userId, 'HUB_WALLET_ADJUST', `${direction} ${amount.toLocaleString()}đ cho ${user?.name}: ${reason}`);
            return NextResponse.json({ message: `${direction} ${amount.toLocaleString()}đ → Số dư: ${result.toLocaleString()}đ` });
        }

        return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi xử lý';
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
