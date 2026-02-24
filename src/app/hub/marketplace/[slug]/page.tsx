'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';

interface ProductDetail {
    id: string; key: string; slug: string; name: string;
    tagline: string | null; outcomeText: string | null;
    industry: string[]; icon: string | null;
    priceMonthly: number;
    features: Array<{ text: string; included: boolean }> | null;
    faq: Array<{ q: string; a: string }> | null;
}

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [applying, setApplying] = useState(false);
    const router = useRouter();
    const { success, error: toastError } = useToast();

    useEffect(() => {
        fetch(`/api/hub/products/${slug}`)
            .then(r => r.json())
            .then(d => { setProduct(d.product || null); setLoading(false); })
            .catch(() => setLoading(false));
    }, [slug]);

    const handleApply = async () => {
        if (!product) return;
        setApplying(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [{ moduleKey: product.key, months: 1 }] }),
            });
            const data = await res.json();
            if (data.order) {
                success('Đã tạo đơn hàng!');
                router.push(`/hub/billing`);
            } else {
                toastError(data.error || 'Không thể tạo đơn');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setApplying(false);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: i === 1 ? '120px' : '80px', borderRadius: '18px', background: 'var(--bg-card)',  }} />)}
        </div>
    );

    if (!product) return (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Không tìm thấy sản phẩm</p>
            <button onClick={() => router.push('/hub/marketplace')} style={{
                marginTop: '12px', padding: '10px 20px', borderRadius: '12px',
                background: 'var(--accent-gradient)', border: 'none', color: 'white',
                fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>← Quay lại</button>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Back */}
            <button onClick={() => router.push('/hub/marketplace')} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start',
                fontFamily: 'inherit', padding: 0,
            }}>← Sản phẩm</button>

            {/* Hero */}
            <div style={{ padding: '24px 20px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '40px' }}>{product.icon || '📦'}</span>
                    <div>
                        <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '2px' }}>{product.name}</h1>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            {product.priceMonthly > 0 ? `${product.priceMonthly.toLocaleString('vi-VN')}₫/tháng` : 'Miễn phí'}
                        </div>
                    </div>
                </div>
                {product.tagline && <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-primary)', margin: '0 0 8px' }}>{product.tagline}</p>}
                {product.outcomeText && <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{product.outcomeText}</p>}
            </div>

            {/* Features */}
            {product.features && product.features.length > 0 && (
                <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Bạn nhận được gì?</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {product.features.map((f, i) => (
                            <li key={i} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: f.included ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                <span style={{ color: f.included ? 'var(--success)' : 'var(--text-muted)', fontWeight: 700 }}>
                                    {f.included ? '✓' : '—'}
                                </span>
                                <span style={{ textDecoration: f.included ? 'none' : 'line-through' }}>{f.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* FAQ */}
            {product.faq && product.faq.length > 0 && (
                <div style={{ padding: '20px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Câu hỏi thường gặp</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {product.faq.map((item, i) => (
                            <div key={i}>
                                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>❓ {item.q}</div>
                                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '24px' }}>{item.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* CTA */}
            <button onClick={handleApply} disabled={applying} style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                background: 'var(--accent-gradient)', border: 'none',
                color: 'white', fontWeight: 700, fontSize: '16px',
                cursor: applying ? 'wait' : 'pointer', fontFamily: 'inherit',
                boxShadow: 'var(--shadow-glow)', opacity: applying ? 0.6 : 1,
            }}>
                {applying ? 'Đang xử lý…' : product.priceMonthly > 0 ? '⬆ Dùng thử miễn phí' : '✅ Áp dụng ngay'}
            </button>
        </div>
    );
}
