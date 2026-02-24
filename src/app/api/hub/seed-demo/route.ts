import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { spaDb } from '@/lib/db/spa';

const SEED_DATA: Record<string, {
    customers: Array<{ name: string; phone: string; tags: string[] }>;
    services: Array<{ name: string; durationMin: number; price: number; category: string }>;
}> = {
    SPA: {
        customers: [
            { name: 'Nguyễn Thị Lan', phone: '0901234567', tags: ['VIP'] },
            { name: 'Trần Văn Hùng', phone: '0912345678', tags: ['Mới'] },
            { name: 'Lê Thị Mai', phone: '0923456789', tags: ['Thường xuyên'] },
            { name: 'Phạm Minh Tuấn', phone: '0934567890', tags: ['VIP'] },
            { name: 'Hoàng Thị Hoa', phone: '0945678901', tags: ['Mới'] },
        ],
        services: [
            { name: 'Massage toàn thân', durationMin: 90, price: 500000, category: 'Massage' },
            { name: 'Chăm sóc da mặt', durationMin: 60, price: 350000, category: 'Facial' },
            { name: 'Tẩy tế bào chết', durationMin: 45, price: 250000, category: 'Body' },
            { name: 'Đắp mặt nạ collagen', durationMin: 30, price: 200000, category: 'Facial' },
        ],
    },
    SALON: {
        customers: [
            { name: 'Nguyễn Văn An', phone: '0901111111', tags: ['VIP'] },
            { name: 'Trần Thị Bình', phone: '0902222222', tags: ['Mới'] },
            { name: 'Lê Hoàng Cường', phone: '0903333333', tags: ['Thường xuyên'] },
            { name: 'Phạm Thị Dung', phone: '0904444444', tags: [] },
            { name: 'Võ Minh Em', phone: '0905555555', tags: ['Mới'] },
        ],
        services: [
            { name: 'Cắt tóc nam', durationMin: 30, price: 100000, category: 'Tóc' },
            { name: 'Cắt tóc nữ', durationMin: 45, price: 150000, category: 'Tóc' },
            { name: 'Nhuộm tóc', durationMin: 120, price: 500000, category: 'Tóc' },
            { name: 'Uốn tóc', durationMin: 90, price: 400000, category: 'Tóc' },
        ],
    },
    SALES: {
        customers: [
            { name: 'Công ty ABC', phone: '0281234567', tags: ['Lead'] },
            { name: 'Shop Hoa Sen', phone: '0911234567', tags: ['Khách cũ'] },
            { name: 'Nguyễn Văn Đại', phone: '0921234567', tags: ['Lead'] },
            { name: 'Trần Thanh Hà', phone: '0931234567', tags: ['VIP'] },
            { name: 'Lê Minh Khôi', phone: '0941234567', tags: ['Mới'] },
        ],
        services: [
            { name: 'Gói cơ bản', durationMin: 0, price: 500000, category: 'Gói' },
            { name: 'Gói nâng cao', durationMin: 0, price: 1500000, category: 'Gói' },
            { name: 'Tư vấn 1:1', durationMin: 60, price: 300000, category: 'Dịch vụ' },
        ],
    },
};

// Fallback for CLINIC, PERSONAL, etc.
const DEFAULT_SEED = SEED_DATA.SPA;

export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { workspaceId, industry, goal } = body;

    if (!workspaceId) {
        return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    }

    // Verify workspace exists
    const ws = await platformDb.workspace.findUnique({ where: { id: workspaceId } });
    if (!ws) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
    }

    try {
        const seedData = SEED_DATA[industry] || DEFAULT_SEED;

        // Create customers
        const customerIds: string[] = [];
        for (const c of seedData.customers) {
            const customer = await spaDb.customer.create({
                data: {
                    workspaceId,
                    name: c.name,
                    phone: c.phone,
                    tagsJson: c.tags,
                },
            });
            customerIds.push(customer.id);
        }

        // Create services
        const serviceIds: string[] = [];
        for (const s of seedData.services) {
            const service = await spaDb.service.create({
                data: {
                    workspaceId,
                    name: s.name,
                    durationMin: s.durationMin,
                    price: s.price,
                    category: s.category,
                },
            });
            serviceIds.push(service.id);
        }

        // Create 3 demo appointments for today/tomorrow
        if (customerIds.length > 0 && serviceIds.length > 0) {
            const now = new Date();
            for (let i = 0; i < Math.min(3, customerIds.length); i++) {
                const startAt = new Date(now);
                startAt.setHours(10 + i * 2, 0, 0, 0);
                if (startAt < now) {
                    startAt.setDate(startAt.getDate() + 1);
                }
                const endAt = new Date(startAt);
                endAt.setMinutes(endAt.getMinutes() + (seedData.services[i % serviceIds.length]?.durationMin || 60));

                await spaDb.appointment.create({
                    data: {
                        workspaceId,
                        customerId: customerIds[i],
                        serviceId: serviceIds[i % serviceIds.length],
                        startAt,
                        endAt,
                        status: 'SCHEDULED',
                    },
                });
            }
        }

        // Log the seed event
        await platformDb.eventLog.create({
            data: {
                workspaceId,
                actorUserId: (authResult as { user: { userId: string } }).user.userId,
                type: 'DEMO_SEEDED',
                payloadJson: { industry, goal, customers: customerIds.length, services: serviceIds.length },
            },
        });

        return NextResponse.json({
            ok: true,
            seeded: {
                customers: customerIds.length,
                services: serviceIds.length,
                appointments: Math.min(3, customerIds.length),
            },
        });
    } catch (error) {
        console.error('Seed demo error:', error);
        return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
    }
}
