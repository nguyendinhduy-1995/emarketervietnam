import { NextResponse } from 'next/server';
import { platformDb } from '@/lib/db/platform';
import { spaDb } from '@/lib/db/spa';
import { z } from 'zod';

// Reuse tenant resolution logic
async function resolveTenant(spaSlug: string) {
    const ws = await platformDb.workspace.findUnique({
        where: { slug: spaSlug },
        select: { id: true, name: true, org: { select: { name: true } } }
    });
    return ws;
}

// GET: Fetch workspace details, active services, and check entitlement
export async function GET(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspace = await resolveTenant(spaSlug);
        if (!workspace) {
            return NextResponse.json({ error: 'Không tìm thấy Spa' }, { status: 404 });
        }

        // Check ONLINE_BOOKING entitlement
        const entitlement = await platformDb.entitlement.findFirst({
            where: {
                workspaceId: workspace.id,
                moduleKey: 'ONLINE_BOOKING'
            }
        });

        if (!entitlement || entitlement.status !== 'ACTIVE') {
            return NextResponse.json(
                { error: 'Tính năng Đặt lịch trực tuyến chưa được kích hoạt cho Spa này.' },
                { status: 403 }
            );
        }

        // Fetch active services
        const services = await spaDb.service.findMany({
            where: { workspaceId: workspace.id, isActive: true },
            orderBy: [{ category: 'asc' }, { name: 'asc' }],
            select: { id: true, name: true, durationMin: true, price: true, category: true }
        });

        return NextResponse.json({
            spa: { name: workspace.name, orgName: workspace.org.name },
            services
        });

    } catch (error) {
        console.error('Public booking GET error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

const bookingSchema = z.object({
    serviceId: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format YYYY-MM-DD"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format HH:MM"),
    customerName: z.string().min(2, "Tên quá ngắn"),
    customerPhone: z.string().min(9, "SĐT không hợp lệ"),
    notes: z.string().optional()
});

// POST: Submit a booking
export async function POST(
    request: Request,
    { params }: { params: Promise<{ spaSlug: string }> }
) {
    try {
        const { spaSlug } = await params;
        const workspace = await resolveTenant(spaSlug);
        if (!workspace) {
            return NextResponse.json({ error: 'Không tìm thấy Spa' }, { status: 404 });
        }

        // Check entitlement again on POST
        const entitlement = await platformDb.entitlement.findFirst({
            where: { workspaceId: workspace.id, moduleKey: 'ONLINE_BOOKING' }
        });
        if (!entitlement || entitlement.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Tính năng chưa được kích hoạt.' }, { status: 403 });
        }

        const body = await request.json();
        const data = bookingSchema.parse(body);

        // Verify service exists and belongs to this workspace
        const service = await spaDb.service.findUnique({
            where: { id: data.serviceId, workspaceId: workspace.id }
        });

        if (!service || !service.isActive) {
            return NextResponse.json({ error: 'Dịch vụ không hợp lệ' }, { status: 400 });
        }

        // Find or create customer by phone (within this workspace)
        let customer = await spaDb.customer.findFirst({
            where: { workspaceId: workspace.id, phone: data.customerPhone }
        });

        if (!customer) {
            customer = await spaDb.customer.create({
                data: {
                    workspaceId: workspace.id,
                    name: data.customerName,
                    phone: data.customerPhone
                }
            });
        } else if (customer.name !== data.customerName) {
            // Optional: update name if different, or keep existing. We'll update for now.
            await spaDb.customer.update({
                where: { id: customer.id },
                data: { name: data.customerName }
            });
        }

        // Calculate start/end times
        const startAt = new Date(`${data.date}T${data.time}:00`);
        if (isNaN(startAt.getTime())) {
            return NextResponse.json({ error: 'Ngày giờ không hợp lệ' }, { status: 400 });
        }

        const endAt = new Date(startAt.getTime() + service.durationMin * 60000);

        // Create appointment
        const appointment = await spaDb.appointment.create({
            data: {
                workspaceId: workspace.id,
                customerId: customer.id,
                serviceId: service.id,
                startAt,
                endAt,
                status: 'SCHEDULED',
                notes: data.notes ? `[Online Booking] ${data.notes}` : '[Online Booking]'
            }
        });

        return NextResponse.json({
            success: true,
            appointmentId: appointment.id,
            startAt: appointment.startAt,
            serviceName: service.name
        });

    } catch (error) {
        console.error('Public booking POST error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: 'Dữ liệu không hợp lệ', details: error.issues }, { status: 400 });
        }
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
