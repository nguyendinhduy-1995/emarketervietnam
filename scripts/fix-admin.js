const { PrismaClient } = require('../node_modules/.prisma/platform');
const db = new PrismaClient();

async function main() {
    // Set admin on ALL users that have lead- prefix emails (browser test users)
    const updates = await db.user.updateMany({
        where: {
            OR: [
                { email: { contains: 'lead-' } },
                { email: { contains: 'tester' } },
                { email: 'admin@emarketervietnam.vn' },
                { name: 'Kh' },
            ]
        },
        data: { isAdmin: true, emkRole: 'ADMIN' },
    });
    console.log('Updated', updates.count, 'users to ADMIN');

    // Verify
    const admins = await db.user.findMany({
        where: { isAdmin: true },
        select: { id: true, name: true, email: true, isAdmin: true, emkRole: true },
    });
    console.log('Admin users:', JSON.stringify(admins, null, 2));
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); });
