import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/smk/auth';
import db from '@/lib/db/smk';

/* ═══ POST /api/smk/admin/inventory/reserve — reserve stock for checkout ═══ */
export async function POST(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const body = await req.json();
    const { variantId, qty, warehouseId, orderId, timeoutMinutes = 15 } = body;

    if (!variantId || !qty || qty < 1) {
        return NextResponse.json({ error: 'variantId, qty required' }, { status: 400 });
    }

    try {
        const result = await db.$transaction(async (tx) => {
            // Lock the variant row
            const variant = await tx.productVariant.findUnique({ where: { id: variantId } });
            if (!variant) throw new Error('Variant not found');

            const available = variant.stockQty - variant.reservedQty;
            if (available < qty) {
                throw new Error(`Không đủ hàng: còn ${available}, cần ${qty}`);
            }

            // Reserve
            const updated = await tx.productVariant.update({
                where: { id: variantId },
                data: { reservedQty: { increment: qty } },
            });

            // Write ledger entry
            await tx.inventoryLedger.create({
                data: {
                    variantId,
                    warehouseId: warehouseId || 'default',
                    type: 'RESERVE',
                    qty: -qty,
                    balance: updated.stockQty - updated.reservedQty,
                    refType: 'order',
                    refId: orderId || null,
                    note: `Reserve ${qty} for ${timeoutMinutes}min`,
                },
            });

            return {
                reserved: qty,
                availableAfter: updated.stockQty - updated.reservedQty,
                expiresAt: new Date(Date.now() + timeoutMinutes * 60000),
            };
        });

        return NextResponse.json(result);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Reserve failed';
        return NextResponse.json({ error: msg }, { status: 422 });
    }
}

/* ═══ DELETE /api/smk/admin/inventory/reserve — release expired reservations ═══ */
export async function DELETE(req: NextRequest) {
    const authError = requireAdmin(req, 'products');
    if (authError) return authError;

    const body = await req.json();
    const { variantId, qty } = body;

    if (!variantId || !qty) {
        return NextResponse.json({ error: 'variantId, qty required' }, { status: 400 });
    }

    const updated = await db.productVariant.update({
        where: { id: variantId },
        data: { reservedQty: { decrement: Math.max(0, qty) } },
    });

    await db.inventoryLedger.create({
        data: {
            variantId,
            warehouseId: 'default',
            type: 'RELEASE',
            qty,
            balance: updated.stockQty - updated.reservedQty,
            refType: 'reserve',
            note: 'Released reservation',
        },
    });

    return NextResponse.json({ released: qty, availableAfter: updated.stockQty - updated.reservedQty });
}
