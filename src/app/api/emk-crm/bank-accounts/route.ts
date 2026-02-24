import { NextRequest, NextResponse } from 'next/server';
import { requireCrmAuth } from '@/lib/auth/crm-middleware';
import { platformDb } from '@/lib/db/platform';

// GET – Danh sách tài khoản ngân hàng
export async function GET(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const accounts = await platformDb.bankAccount.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ accounts });
}

// POST – Thêm tài khoản ngân hàng mới
export async function POST(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { bankName, bankCode, bin, accountNumber, accountName } = await req.json();

    if (!bankName || !accountNumber || !accountName) {
        return NextResponse.json({ error: 'Thiếu thông tin: bankName, accountNumber, accountName' }, { status: 400 });
    }

    // Deactivate all other accounts (only 1 active at a time)
    await platformDb.bankAccount.updateMany({
        where: { isActive: true },
        data: { isActive: false },
    });

    const account = await platformDb.bankAccount.create({
        data: {
            bankName,
            bankCode: bankCode || null,
            bin: bin || null,
            accountNumber,
            accountName,
            isActive: true,
        },
    });

    await platformDb.eventLog.create({
        data: {
            actorUserId: auth.user.userId,
            type: 'BANK_ACCOUNT_CREATED',
            payloadJson: { accountId: account.id, bankName, accountNumber },
        },
    });

    return NextResponse.json({ account, message: 'Thêm tài khoản thành công' });
}

// PATCH – Cập nhật hoặc kích hoạt tài khoản
export async function PATCH(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id, bankName, bankCode, bin, accountNumber, accountName, isActive } = await req.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    const existing = await platformDb.bankAccount.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

    // If activating this account, deactivate others
    if (isActive === true) {
        await platformDb.bankAccount.updateMany({
            where: { isActive: true, id: { not: id } },
            data: { isActive: false },
        });
    }

    const updated = await platformDb.bankAccount.update({
        where: { id },
        data: {
            ...(bankName !== undefined && { bankName }),
            ...(bankCode !== undefined && { bankCode }),
            ...(bin !== undefined && { bin }),
            ...(accountNumber !== undefined && { accountNumber }),
            ...(accountName !== undefined && { accountName }),
            ...(isActive !== undefined && { isActive }),
        },
    });

    await platformDb.eventLog.create({
        data: {
            actorUserId: auth.user.userId,
            type: 'BANK_ACCOUNT_UPDATED',
            payloadJson: { accountId: id, changes: { bankName, bankCode, accountNumber, accountName, isActive } },
        },
    });

    return NextResponse.json({ account: updated, message: 'Cập nhật thành công' });
}

// DELETE – Xoá tài khoản
export async function DELETE(req: NextRequest) {
    const auth = await requireCrmAuth(req);
    if (auth instanceof NextResponse) return auth;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Thiếu id' }, { status: 400 });

    await platformDb.bankAccount.delete({ where: { id } });

    await platformDb.eventLog.create({
        data: {
            actorUserId: auth.user.userId,
            type: 'BANK_ACCOUNT_DELETED',
            payloadJson: { accountId: id },
        },
    });

    return NextResponse.json({ ok: true, message: 'Xoá thành công' });
}
