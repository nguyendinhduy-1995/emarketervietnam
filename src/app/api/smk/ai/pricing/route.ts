import { NextResponse, NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { productName, currentPrice, category, competitors } = await req.json();

        const competitorPrices = competitors?.length
            ? competitors.map((c: { price: number }) => c.price)
            : [currentPrice * 0.85, currentPrice * 1.1, currentPrice * 0.95];

        const avgCompetitor = competitorPrices.reduce((a: number, b: number) => a + b, 0) / competitorPrices.length;
        const minCompetitor = Math.min(...competitorPrices);
        const maxCompetitor = Math.max(...competitorPrices);

        // Price optimization logic
        const elasticity = category === 'premium' ? 0.8 : 1.2;
        const suggestedPrice = Math.round(avgCompetitor * (1 + (0.05 / elasticity)));
        const undercut = Math.round(minCompetitor * 0.97);
        const premium = Math.round(maxCompetitor * 1.03);

        return NextResponse.json({
            currentPrice,
            avgCompetitor: Math.round(avgCompetitor),
            suggestedPrice,
            strategies: [
                { name: 'Cạnh tranh', price: undercut, desc: 'Giá thấp hơn đối thủ 3% để hút khách', risk: 'low' },
                { name: 'Tối ưu', price: suggestedPrice, desc: 'Giá tối ưu dựa trên phân tích thị trường', risk: 'balanced' },
                { name: 'Premium', price: premium, desc: 'Giá cao hơn đối thủ, tập trung giá trị gia tăng', risk: 'high' },
            ],
            analysis: `Giá TB đối thủ: ${avgCompetitor.toLocaleString('vi-VN')}₫. Khoảng giá: ${minCompetitor.toLocaleString('vi-VN')}₫ - ${maxCompetitor.toLocaleString('vi-VN')}₫. Đề xuất: ${suggestedPrice.toLocaleString('vi-VN')}₫ (${suggestedPrice > currentPrice ? 'tăng' : 'giảm'} ${Math.abs(Math.round(((suggestedPrice - currentPrice) / currentPrice) * 100))}%).`,
        });
    } catch {
        return NextResponse.json({ error: 'Lỗi phân tích giá' }, { status: 500 });
    }
}
