'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { vnd } from '@/lib/format';

interface ProductDetail {
    id: string; key: string; slug: string; name: string;
    type: string; billingModel: string; deliveryMethod: string; status: string;
    tagline: string | null; outcomeText: string | null; description: string | null;
    thumbnail: string | null; icon: string | null; industry: string[];
    priceOriginal: number; priceRental: number; priceSale: number; priceMonthly: number;
    features: Array<{ text: string; included: boolean }> | null;
    faq: Array<{ q: string; a: string }> | null;
    meteredItems: Array<{ key: string; unitName: string; unitPrice: number }>;
    digitalAssets: Array<{ id: string; filename: string; size: number }>;
    plans: Array<{ plan: { id: string; name: string; price: number; cycle: string; trialDays: number; features: unknown } }>;
}

const TYPE_BADGE: Record<string, { emoji: string; bg: string; color: string; label: string }> = {
    CRM: { emoji: '🏢', bg: '#dbeafe', color: '#1e40af', label: 'CRM Add-on' },
    APP: { emoji: '📱', bg: '#fef3c7', color: '#92400e', label: 'Ứng dụng' },
    DIGITAL: { emoji: '📥', bg: '#d1fae5', color: '#065f46', label: 'Tài liệu' },
};

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const { success, error: toastError } = useToast();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<{ balanceAvailable: number; creditBalance: number } | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [purchasing, setPurchasing] = useState(false);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

    // Load product
    useEffect(() => {
        fetch(`/api/hub/products/${slug}`)
            .then(r => r.json())
            .then(d => {
                setProduct(d.product || null);
                if (d.product?.plans?.length) setSelectedPlanId(d.product.plans[0].plan.id);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [slug]);

    // Load wallet balance
    useEffect(() => {
        fetch('/api/hub/wallet').then(r => r.ok ? r.json() : null).then(d => {
            if (d?.balance !== undefined) {
                setWallet({ balanceAvailable: d.balance, creditBalance: d.creditBalance || 0 });
            }
        });
    }, []);

    const getPrice = () => {
        if (!product) return 0;
        if (product.billingModel === 'SUBSCRIPTION') return product.priceRental || product.priceMonthly;
        if (product.billingModel === 'ONE_TIME') return product.priceSale || product.priceOriginal;
        return 0; // PAYG — no upfront
    };

    const handleCheckout = async () => {
        if (!product) return;
        setPurchasing(true);
        try {
            const res = await fetch('/api/hub/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    planId: selectedPlanId,
                    couponCode: couponCode.trim() || undefined,
                    idempotencyKey: `checkout_${product.id}_${Date.now()}`,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                success(`Mua "${product.name}" thành công! ${data.discount > 0 ? `Đã giảm ${vnd(data.discount)}` : ''}`);
                if (data.productType === 'DIGITAL') router.push('/hub/downloads');
                else router.push('/hub/orders');
            } else {
                if (data.code === 'INSUFFICIENT_BALANCE') {
                    toastError(`Cần ${vnd(data.required)} — Còn ${vnd(data.balance)}. Vui lòng nạp thêm.`);
                } else {
                    toastError(data.error || 'Lỗi thanh toán');
                }
            }
        } catch { toastError('Lỗi kết nối'); }
        setPurchasing(false);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: i === 1 ? '140px' : '80px', borderRadius: '18px', background: 'var(--bg-card)' }} />)}
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

    const price = getPrice();
    const tb = TYPE_BADGE[product.type] || TYPE_BADGE.CRM;
    const totalBalance = (wallet?.balanceAvailable || 0) + (wallet?.creditBalance || 0);
    const insufficient = price > totalBalance;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Back */}
            <button onClick={() => router.push('/hub/marketplace')} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit', padding: 0,
            }}>← Sản phẩm</button>

            {/* Hero card */}
            <div style={{ padding: '20px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '40px' }}>{product.icon || tb.emoji}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{product.name}</h1>
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: tb.bg, color: tb.color }}>{tb.label}</span>
                        </div>
                        {product.tagline && <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, margin: 0 }}>{product.tagline}</p>}
                    </div>
                </div>

                {/* Price display */}
                <div style={{ padding: '12px', borderRadius: '12px', background: 'var(--bg-hover)', marginBottom: '10px' }}>
                    {product.billingModel === 'SUBSCRIPTION' && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800 }}>{vnd(price)}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/tháng</span>
                            {product.priceOriginal > price && <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{vnd(product.priceOriginal)}</span>}
                        </div>
                    )}
                    {product.billingModel === 'ONE_TIME' && (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                            <span style={{ fontSize: '24px', fontWeight: 800 }}>{vnd(price)}</span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>một lần</span>
                            {product.priceOriginal > price && <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{vnd(product.priceOriginal)}</span>}
                        </div>
                    )}
                    {product.billingModel === 'PAYG' && (
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>💰 Trả theo lượt sử dụng</div>
                            {product.meteredItems.map(m => (
                                <div key={m.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                                    <span>{m.unitName} ({m.key})</span>
                                    <strong>{vnd(m.unitPrice)}/{m.unitName}</strong>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {product.outcomeText && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: '0 0 8px' }}>{product.outcomeText}</p>}
                {product.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{product.description}</p>}
            </div>

            {/* Plans selector */}
            {product.plans.length > 1 && (
                <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📋 Chọn gói</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {product.plans.map(({ plan: p }) => (
                            <button key={p.id} onClick={() => setSelectedPlanId(p.id)} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                                border: `2px solid ${selectedPlanId === p.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                                background: selectedPlanId === p.id ? 'rgba(99,102,241,0.05)' : 'transparent',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{p.name}</div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.cycle}{p.trialDays > 0 ? ` · Dùng thử ${p.trialDays} ngày` : ''}</div>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: '14px' }}>{vnd(p.price)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Features */}
            {product.features && product.features.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>✨ Bạn nhận được gì?</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {product.features.map((f, i) => (
                            <li key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: f.included ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                <span style={{ color: f.included ? '#059669' : 'var(--text-muted)', fontWeight: 700 }}>{f.included ? '✓' : '—'}</span>
                                <span style={{ textDecoration: f.included ? 'none' : 'line-through' }}>{f.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Digital assets preview */}
            {product.type === 'DIGITAL' && product.digitalAssets.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '8px' }}>📁 Bạn sẽ nhận</h3>
                    {product.digitalAssets.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', fontSize: '12px' }}>
                            <span>📄</span>
                            <span style={{ flex: 1 }}>{a.filename}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{(a.size / 1024 / 1024).toFixed(1)}MB</span>
                        </div>
                    ))}
                </div>
            )}

            {/* FAQ */}
            {product.faq && product.faq.length > 0 && (
                <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>❓ Câu hỏi thường gặp</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {product.faq.map((item, i) => (
                            <div key={i}>
                                <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '3px' }}>❓ {item.q}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '20px' }}>{item.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Checkout section */}
            {price > 0 && (
                <div style={{ padding: '16px', borderRadius: '18px', background: 'var(--bg-card)', border: '2px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>💳 Thanh toán</h3>

                    {/* Wallet balance */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '8px', fontSize: '12px' }}>
                        <span>Số dư ví</span>
                        <span style={{ fontWeight: 700, color: insufficient ? '#dc2626' : '#059669' }}>
                            {wallet ? vnd(totalBalance) : 'Đang tải...'}
                            {wallet?.creditBalance ? ` (${vnd(wallet.creditBalance)} credit)` : ''}
                        </span>
                    </div>
                    {insufficient && (
                        <div style={{ fontSize: '11px', color: '#dc2626', padding: '6px 10px', borderRadius: '8px', background: '#fee2e2', marginBottom: '8px' }}>
                            ⚠️ Cần thêm {vnd(price - totalBalance)}. <a href="/hub/billing" style={{ color: '#1e40af', fontWeight: 700 }}>Nạp tiền →</a>
                        </div>
                    )}

                    {/* Coupon input */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <input placeholder="Mã giảm giá (nếu có)" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '12px', background: 'var(--bg)', letterSpacing: '1px', fontWeight: 700 }} />
                        {couponCode && (
                            <button onClick={() => setCouponCode('')} style={{ padding: '6px 8px', borderRadius: '8px', border: 'none', background: 'var(--bg-hover)', cursor: 'pointer', fontSize: '10px' }}>✕</button>
                        )}
                    </div>

                    {/* Summary */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>
                        <span>Tổng</span>
                        <span>{vnd(price)}</span>
                    </div>
                </div>
            )}

            {/* CTA */}
            <button onClick={handleCheckout} disabled={purchasing || (price > 0 && insufficient)} style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                background: purchasing || (price > 0 && insufficient) ? 'var(--bg-hover)' : 'var(--accent-gradient)',
                border: 'none', color: purchasing || (price > 0 && insufficient) ? 'var(--text-muted)' : 'white',
                fontWeight: 700, fontSize: '16px', cursor: purchasing || (price > 0 && insufficient) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: purchasing || (price > 0 && insufficient) ? 'none' : 'var(--shadow-glow)',
            }}>
                {purchasing ? '⏳ Đang xử lý…' : price > 0 ? `💳 Thanh toán ${vnd(price)}` : product.billingModel === 'PAYG' ? '🚀 Kích hoạt' : '✅ Áp dụng miễn phí'}
            </button>
        </div>
    );
}
