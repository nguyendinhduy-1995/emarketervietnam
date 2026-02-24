const { PrismaClient } = require('../node_modules/.prisma/platform');
const db = new PrismaClient();

async function main() {
    // Find a user to be the owner
    const user = await db.user.findFirst({ where: { emkRole: { not: null } } });
    console.log('Owner:', user?.id, user?.name);

    const leads = [
        { name: 'Nguyen Thi Mai', phone: '0901234500', email: 'mai@spa.vn', industry: 'SPA', size: 'SMALL', need: 'CRM quan ly khach hang Spa', source: 'LP_SPA', ownerId: user?.id },
        { name: 'Tran Van Hung', phone: '0912345600', email: 'hung@salon.vn', industry: 'SALON', size: 'MEDIUM', need: 'Quan ly nhan vien salon toc', source: 'DIRECT', status: 'CONTACTED' },
        { name: 'Le Hoang Anh', phone: '0923456700', email: 'anh@clinic.vn', industry: 'CLINIC', need: 'Tich hop Zalo OA', source: 'ADS', status: 'ONBOARDING' },
    ];

    for (const lead of leads) {
        try {
            const created = await db.emkLead.create({ data: lead });
            console.log('Created lead:', created.id, created.name);
        } catch (e) {
            console.log('Lead may exist already:', lead.name, e.message?.substring(0, 80));
        }
    }

    // Add notes and tasks on first lead
    const firstLead = await db.emkLead.findFirst({ orderBy: { createdAt: 'asc' } });
    if (firstLead && user) {
        await db.emkNote.create({ data: { leadId: firstLead.id, authorId: user.id, content: 'Da goi dien, khach quan tam goi SPA CRM. Hen demo vao thu 5.' } });
        await db.emkNote.create({ data: { leadId: firstLead.id, authorId: user.id, content: 'Khach muon biet them ve tinh nang dat lich tu dong va tich hop Zalo.' } });
        console.log('Added 2 notes to lead:', firstLead.name);

        await db.emkTask.create({ data: { title: 'Demo san pham cho khach', type: 'DEMO', ownerId: user.id, relatedLeadId: firstLead.id, dueDate: new Date(Date.now() + 2 * 86400000) } });
        await db.emkTask.create({ data: { title: 'Follow-up sau demo', type: 'FOLLOW_UP', ownerId: user.id, relatedLeadId: firstLead.id, dueDate: new Date(Date.now() + 5 * 86400000) } });
        console.log('Added 2 tasks to lead:', firstLead.name);
    }

    console.log('Done!');
}

main().then(() => db.$disconnect()).catch(e => { console.error(e); db.$disconnect(); });
