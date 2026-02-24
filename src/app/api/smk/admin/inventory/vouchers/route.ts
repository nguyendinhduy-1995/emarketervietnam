import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

/* ═══ GET /api/smk/admin/inventory/vouchers — list vouchers ═══ */
export async function GET(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const sp = req.nextUrl.searchParams;
    const type = sp.get('type') || undefined;
    const status = sp.get('status') || undefined;
    const warehouseId = sp.get('warehouseId') || undefined;
    const page = Math.max(1, Number(sp.get('page')) || 1);
    const limit = 30;

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;

    const [vouchers, total] = await Promise.all([
        db.inventoryVoucher.findMany({
            where,
            include: { warehouse: true, items: true },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * limit,
            take: limit,
        }),
        db.inventoryVoucher.count({ where }),
    ]);

    return NextResponse.json({ vouchers, total, page });
}

/* ═══ POST /api/smk/admin/inventory/vouchers — create voucher ═══ */
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const body = await req.json();
    const { type, warehouseId, note, reason, items, createdBy } = body;

    if (!type || !warehouseId || !items?.length) {
        return NextResponse.json({ error: 'type, warehouseId, items required' }, { status: 400 });
    }

    // Auto-generate voucher code
    const prefix = type === 'RECEIPT' ? 'VCH-IN' : type === 'ISSUE' ? 'VCH-OUT' : 'VCH-ADJ';
    const count = await db.inventoryVoucher.count({ where: { type } }) + 1;
    const code = `${prefix}-${String(count).padStart(4, '0')}`;

    const voucher = await db.inventoryVoucher.create({
        data: {
            code,
            type,
            warehouseId,
            note: note || null,
            reason: reason || null,
            createdBy: createdBy || 'system',
            items: {
                create: items.map((it: { variantId: string; qty: number; note?: string }) => ({
                    variantId: it.variantId,
                    qty: it.qty,
                    note: it.note || null,
                })),
            },
        },
        include: { items: true, warehouse: true },
    });

    return NextResponse.json({ voucher }, { status: 201 });
}

/* ═══ PATCH /api/smk/admin/inventory/vouchers — advance status ═══ */
export async function PATCH(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const body = await req.json();
    const { id, action, approvedBy } = body;

    if (!id || !action) {
        return NextResponse.json({ error: 'id, action required' }, { status: 400 });
    }

    const voucher = await db.inventoryVoucher.findUnique({
        where: { id },
        include: { items: true },
    });
    if (!voucher) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const transitions: Record<string, string> = {
        submit: 'SUBMITTED',
        approve: 'APPROVED',
        post: 'POSTED',
        cancel: 'CANCELLED',
    };
    const nextStatus = transitions[action];
    if (!nextStatus) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

    // Validate transitions
    const validFlow: Record<string, string[]> = {
        DRAFT: ['SUBMITTED', 'CANCELLED'],
        SUBMITTED: ['APPROVED', 'CANCELLED'],
        APPROVED: ['POSTED', 'CANCELLED'],
    };
    if (!validFlow[voucher.status]?.includes(nextStatus)) {
        return NextResponse.json({ error: `Cannot ${action} from ${voucher.status}` }, { status: 422 });
    }

    // On POST: write ledger entries + update stock atomically
    if (nextStatus === 'POSTED') {
        await db.$transaction(async (tx) => {
            for (const item of voucher.items) {
                const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
                if (!variant) throw new Error(`Variant ${item.variantId} not found`);

                let qtyDelta: number;
                let ledgerType: string;

                if (voucher.type === 'RECEIPT') {
                    qtyDelta = item.qty;
                    ledgerType = 'RECEIPT';
                } else if (voucher.type === 'ISSUE') {
                    if (variant.stockQty < item.qty) {
                        throw new Error(`Không đủ tồn kho cho ${variant.sku}: có ${variant.stockQty}, cần ${item.qty}`);
                    }
                    qtyDelta = -item.qty;
                    ledgerType = 'ISSUE';
                } else {
                    // ADJUST: qty can be positive (increase) or negative (decrease)
                    qtyDelta = item.qty;
                    ledgerType = 'ADJUST';
                    if (variant.stockQty + qtyDelta < 0) {
                        throw new Error(`Điều chỉnh sẽ gây tồn âm cho ${variant.sku}`);
                    }
                }

                const newBalance = variant.stockQty + qtyDelta;

                await tx.productVariant.update({
                    where: { id: item.variantId },
                    data: { stockQty: newBalance },
                });

                await tx.inventoryLedger.create({
                    data: {
                        variantId: item.variantId,
                        warehouseId: voucher.warehouseId,
                        type: ledgerType as 'RECEIPT' | 'ISSUE' | 'ADJUST',
                        qty: qtyDelta,
                        balance: newBalance,
                        refType: 'voucher',
                        refId: voucher.id,
                        note: item.note || voucher.note || null,
                        createdBy: approvedBy || voucher.createdBy,
                    },
                });
            }

            await tx.inventoryVoucher.update({
                where: { id },
                data: { status: 'POSTED', postedAt: new Date(), approvedBy: approvedBy || null },
            });
        });

        const updated = await db.inventoryVoucher.findUnique({
            where: { id },
            include: { items: true, warehouse: true },
        });
        return NextResponse.json({ voucher: updated });
    }

    // Non-POSTED transitions
    const updated = await db.inventoryVoucher.update({
        where: { id },
        data: {
            status: nextStatus as 'SUBMITTED' | 'APPROVED' | 'CANCELLED',
            approvedBy: action === 'approve' ? (approvedBy || null) : undefined,
        },
        include: { items: true, warehouse: true },
    });

    return NextResponse.json({ voucher: updated });
}
