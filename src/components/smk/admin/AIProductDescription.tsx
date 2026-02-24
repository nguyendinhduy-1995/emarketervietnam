'use client';

import { useState } from 'react';

export default function AIProductDescription({ productName, category, brand }: { productName?: string; category?: string; brand?: string }) {
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/smk/admin/ai/product-content', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: productName, category, brand, type: 'description' }),
            });
            const data = await res.json();
            setDescription(data.content || data.description || '');
        } catch {
            setDescription(`${productName || 'Sản phẩm'} — ${brand || 'Thương hiệu cao cấp'}\n\n✅ Chất liệu cao cấp, bền bỉ\n✅ Thiết kế hiện đại, phù hợp nhiều khuôn mặt\n✅ Tròng kính chống UV400, bảo vệ mắt tối ưu\n✅ Bảo hành chính hãng 12 tháng\n\n📦 Miễn phí giao hàng toàn quốc\n🔄 Đổi trả trong 7 ngày\n💎 Cam kết chính hãng 100%`);
        }
        setLoading(false);
    };

    const copy = () => {
        navigator.clipboard.writeText(description);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', display: 'flex', alignItems: 'center', gap: 4 }}>
                    ✍️ AI Mô tả
                    <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 99, background: 'rgba(168,85,247,0.12)' }}>AI</span>
                </span>
                <button className="btn btn-sm" onClick={generate} disabled={loading}
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'none', fontSize: 11 }}>
                    {loading ? '⏳ Đang viết...' : '🤖 Viết mô tả'}
                </button>
            </div>
            {description && (
                <>
                    <textarea value={description} onChange={e => setDescription(e.target.value)}
                        style={{
                            width: '100%', minHeight: 120, padding: 10, borderRadius: 6,
                            background: 'var(--bg-secondary)', border: '1px solid var(--border-primary)',
                            color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.6, resize: 'vertical',
                        }} />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                        <button className="btn btn-sm" onClick={copy} style={{ fontSize: 10 }}>
                            {copied ? '✅ Đã copy' : '📋 Copy'}
                        </button>
                        <button className="btn btn-sm" onClick={generate} disabled={loading} style={{ fontSize: 10 }}>
                            🔄 Viết lại
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
