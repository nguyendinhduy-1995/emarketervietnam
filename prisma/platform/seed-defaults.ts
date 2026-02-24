import { platformDb } from '../../src/lib/db/platform';
import { hashPassword } from '../../src/lib/auth/password';

async function seedDefaults() {
    console.log('🌱 Seeding default accounts...\n');

    // ─── CRM Admin Account ────────────────────────────────────
    const crmPhone = '0948742666';
    const crmPassword = 'Nguyendinhduy@95';
    const crmHash = await hashPassword(crmPassword);

    const crmUser = await platformDb.user.upsert({
        where: { phone: crmPhone },
        update: {
            name: 'eMarketervietnam',
            passwordHash: crmHash,
            isAdmin: true,
            emkRole: 'ADMIN',
            status: 'ACTIVE',
        },
        create: {
            phone: crmPhone,
            name: 'eMarketervietnam',
            email: 'admin@emarketervietnam.vn',
            passwordHash: crmHash,
            isAdmin: true,
            emkRole: 'ADMIN',
            status: 'ACTIVE',
        },
    });
    console.log(`✅ CRM Admin: ${crmUser.name} (${crmUser.phone}) — isAdmin: ${crmUser.isAdmin}, emkRole: ${crmUser.emkRole}`);

    // ─── Hub User Account ─────────────────────────────────────
    const hubPhone = '0902795323';
    const hubPassword = 'Nguyendinhduy@95';
    const hubHash = await hashPassword(hubPassword);

    const hubUser = await platformDb.user.upsert({
        where: { phone: hubPhone },
        update: {
            name: 'nguyendinhduy',
            passwordHash: hubHash,
            isAdmin: false,
            emkRole: null,
            status: 'ACTIVE',
        },
        create: {
            phone: hubPhone,
            name: 'nguyendinhduy',
            email: 'nguyendinhduy@emarketervietnam.vn',
            passwordHash: hubHash,
            isAdmin: false,
            emkRole: null,
            status: 'ACTIVE',
        },
    });
    console.log(`✅ Hub User: ${hubUser.name} (${hubUser.phone}) — isAdmin: ${hubUser.isAdmin}`);

    // ─── Wallet for Hub User ──────────────────────────────────
    const walletAmount = 999999999;
    const wallet = await platformDb.wallet.upsert({
        where: { userId: hubUser.id },
        update: {
            balanceAvailable: walletAmount,
        },
        create: {
            userId: hubUser.id,
            balanceAvailable: walletAmount,
        },
    });
    console.log(`✅ Wallet: ${hubUser.name} — ${walletAmount.toLocaleString('vi-VN')}đ (ID: ${wallet.id})`);

    // ─── Wallet Ledger Entry ──────────────────────────────────
    const existingEntry = await platformDb.walletLedger.findFirst({
        where: { walletId: wallet.id, refType: 'SEED_TOPUP' },
    });
    if (!existingEntry) {
        await platformDb.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: hubUser.id,
                type: 'TOPUP',
                amount: walletAmount,
                direction: 'CREDIT',
                refType: 'SEED_TOPUP',
                refId: 'seed-default',
                idempotencyKey: 'seed-default-topup',
                note: 'Số dư khởi tạo mặc định',
            },
        });
        console.log(`✅ Wallet ledger entry created`);
    } else {
        console.log(`ℹ️  Wallet ledger entry already exists (skipped)`);
    }

    console.log('\n🎉 Seed completed!\n');
    console.log('📋 Tài khoản mặc định:');
    console.log('┌──────────────────────────────────────────────────────┐');
    console.log(`│ CRM  │ SĐT: ${crmPhone} │ MK: ${crmPassword} │ ADMIN │`);
    console.log(`│ Hub  │ SĐT: ${hubPhone} │ MK: ${hubPassword} │ Ví: 999,999,999đ │`);
    console.log('└──────────────────────────────────────────────────────┘');
}

seedDefaults()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    });
