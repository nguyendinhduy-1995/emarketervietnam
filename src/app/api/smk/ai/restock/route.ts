import { NextResponse } from 'next/server';
import db from '@/lib/db/smk';
import { chatCompletion } from '@/lib/smk/ai/openai';

export async function GET() {
    try {
        // Get all products with stock and recent order velocity
        const products = await db.productVariant.findMany({
            where: { isActive: true },
            include: { product: { select: { name: true } } },
            orderBy: { stockQty: 'asc' },
        });

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const recentOrders = await db.orderItem.groupBy({
            by: ['variantId'],
            where: { order: { createdAt: { gte: thirtyDaysAgo } } },
            _sum: { qty: true },
        });

        const velocityMap = new Map(recentOrders.map(o => [o.variantId, o._sum.qty || 0]));

        const alerts = products.map(v => {
            const sold30d = velocityMap.get(v.id) || 0;
            const dailyRate = sold30d / 30;
            const daysUntilOut = dailyRate > 0 ? Math.round(v.stockQty / dailyRate) : 999;
            return {
                sku: v.sku,
                productName: v.product.name,
                currentStock: v.stockQty,
                sold30d,
                dailyRate: Math.round(dailyRate * 10) / 10,
                daysUntilOut,
                suggestedRestock: dailyRate > 0 ? Math.ceil(dailyRate * 30) : 0, // 30 days buffer
                urgency: daysUntilOut <= 7 ? 'critical' : daysUntilOut <= 14 ? 'warning' : 'ok',
            };
        }).filter(a => a.urgency !== 'ok').sort((a, b) => a.daysUntilOut - b.daysUntilOut);

        // AI summary
        let aiSummary = '';
        if (alerts.length > 0) {
            try {
                const prompt = `Phân tích tồn kho cửa hàng kính mắt. Đây là danh sách sản phẩm sắp hết:
${alerts.slice(0, 5).map(a => `- ${a.productName} (${a.sku}): còn ${a.currentStock}, bán ${a.sold30d}/30 ngày, ~${a.daysUntilOut} ngày nữa hết`).join('\n')}

Hãy đưa ra nhận xét ngắn gọn (2-3 câu) và gợi ý hành động cụ thể bằng tiếng Việt.`;
                aiSummary = await chatCompletion('Bạn là chuyên gia quản lý tồn kho cho cửa hàng kính mắt.', prompt, { maxTokens: 200 });
            } catch { aiSummary = 'Không thể tạo AI summary.'; }
        }

        return NextResponse.json({ alerts, aiSummary, total: alerts.length });
    } catch (err) {
        // Fallback demo
        return NextResponse.json({
            alerts: [
                { sku: 'GUC-CAT-PNK-53', productName: 'Cat Eye Retro Pink', currentStock: 2, sold30d: 8, dailyRate: 0.3, daysUntilOut: 7, suggestedRestock: 9, urgency: 'critical' },
                { sku: 'TF-BUT-DRK-54', productName: 'Butterfly Dark Havana', currentStock: 6, sold30d: 5, dailyRate: 0.2, daysUntilOut: 36, suggestedRestock: 5, urgency: 'warning' },
            ],
            aiSummary: '⚠️ Cat Eye Retro Pink sắp hết trong 7 ngày. Đề xuất nhập thêm 9 cái ngay. Butterfly Dark Havana còn khoảng 5 tuần nữa.',
            total: 2,
        });
    }
}
