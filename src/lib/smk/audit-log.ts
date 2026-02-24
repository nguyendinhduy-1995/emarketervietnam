import db from '@/lib/db/smk';

/**
 * Log a product-related audit event to EventLog.
 * Stores before/after diff in payload for versioning.
 * Uses JSON.parse(JSON.stringify(...)) to ensure Prisma-compatible JSON.
 */
export async function logProductChange(params: {
    type: 'PRODUCT_CREATED' | 'PRODUCT_UPDATED' | 'PRODUCT_PUBLISHED' | 'PRODUCT_ARCHIVED'
    | 'PRODUCT_PRICE_CHANGED' | 'PRODUCT_STOCK_CHANGED' | 'PRODUCT_IMAGE_CHANGED' | 'PRODUCT_VARIANT_CHANGED';
    actorUserId?: string;
    productId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    note?: string;
}) {
    try {
        const payload = JSON.parse(JSON.stringify({
            productId: params.productId,
            before: params.before || null,
            after: params.after || null,
            note: params.note || null,
            timestamp: new Date().toISOString(),
        }));
        await db.eventLog.create({
            data: {
                type: params.type,
                actorUserId: params.actorUserId || null,
                payload,
            },
        });
    } catch (e) {
        console.error('[logProductChange]', e);
    }
}

/**
 * Log an inventory-related event.
 */
export async function logInventoryChange(params: {
    type: 'INVENTORY_VOUCHER_POSTED' | 'INVENTORY_STOCKTAKE';
    actorUserId?: string;
    payload: Record<string, unknown>;
}) {
    try {
        const payload = JSON.parse(JSON.stringify(params.payload));
        await db.eventLog.create({
            data: {
                type: params.type,
                actorUserId: params.actorUserId || null,
                payload,
            },
        });
    } catch (e) {
        console.error('[logInventoryChange]', e);
    }
}

/**
 * Log AI content generation usage.
 */
export async function logAIGeneration(params: {
    actorUserId?: string;
    productId?: string;
    channel: string;
    tone: string;
    tokens?: number;
    latencyMs?: number;
}) {
    try {
        const payload = JSON.parse(JSON.stringify({
            productId: params.productId || null,
            channel: params.channel,
            tone: params.tone,
            tokens: params.tokens || 0,
            latencyMs: params.latencyMs || 0,
            timestamp: new Date().toISOString(),
        }));
        await db.eventLog.create({
            data: {
                type: 'AI_CONTENT_GENERATED',
                actorUserId: params.actorUserId || null,
                payload,
            },
        });
    } catch (e) {
        console.error('[logAIGeneration]', e);
    }
}
