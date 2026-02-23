import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, resolveWorkspaceId } from '@/lib/auth/middleware';
import { platformDb } from '@/lib/db/platform';
import { generateOrderCode } from '@/lib/qr';

const createOrderSchema = z.object({
    items: z.array(z.object({
        moduleKey: z.string(),
        months: z.number().min(1).max(12).default(1),
    })).min(1),
});

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const workspaceId = await resolveWorkspaceId(req, authResult.user);
    if (!workspaceId) {
        return NextResponse.json({ error: 'No workspace' }, { status: 404 });
    }

    const orders = await platformDb.upgradeOrder.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    const txns = await platformDb.paymentTxn.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    return NextResponse.json({ orders, transactions: txns });
}

export async function POST(req: NextRequest) {
    try {
        const authResult = await requireAuth(req);
        if (authResult instanceof NextResponse) return authResult;

        const workspaceId = await resolveWorkspaceId(req, authResult.user);
        if (!workspaceId) {
            return NextResponse.json({ error: 'No workspace' }, { status: 404 });
        }

        const body = await req.json();
        const data = createOrderSchema.parse(body);

        // Calculate total amount
        const moduleKeys = data.items.map((i) => i.moduleKey);
        const modules = await platformDb.module.findMany({
            where: { key: { in: moduleKeys }, isActive: true },
        });

        const moduleMap = Object.fromEntries(modules.map((m) => [m.key, m]));
        let totalAmount = 0;
        const itemsJson = data.items.map((item) => {
            const mod = moduleMap[item.moduleKey];
            if (!mod) throw new Error(`Module ${item.moduleKey} not found`);
            const subtotal = mod.priceMonthly * item.months;
            totalAmount += subtotal;
            return {
                moduleKey: item.moduleKey,
                moduleName: mod.name,
                months: item.months,
                priceMonthly: mod.priceMonthly,
                subtotal,
            };
        });

        // Generate unique order code
        let orderCode = generateOrderCode();
        let codeExists = await platformDb.upgradeOrder.findUnique({
            where: { orderCode },
        });
        while (codeExists) {
            orderCode = generateOrderCode();
            codeExists = await platformDb.upgradeOrder.findUnique({
                where: { orderCode },
            });
        }

        // Create order
        const order = await platformDb.upgradeOrder.create({
            data: {
                workspaceId,
                orderCode,
                itemsJson,
                amount: totalAmount,
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
            },
        });

        return NextResponse.json({ order });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Invalid data', details: error.issues },
                { status: 400 }
            );
        }
        console.error('[ORDERS]', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
