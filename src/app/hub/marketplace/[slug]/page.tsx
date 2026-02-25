'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ToastProvider';
import { vnd } from '@/lib/format';

interface AddonDef { featureKey: string; label: string; price: number; trialDays: number; billing: string; requires?: string[] }
interface PlanOption { key: string; label: string; price: number; cycle: string; discount?: string }
interface ProductDetail {
    id: string; key: string; slug: string; name: string; type: string;
    billingModel: string; deliveryMethod: string; status: string;
    tagline: string | null; outcomeText: string | null; description: string | null;
    icon: string | null; industry: string[]; demoUrl: string | null;
    priceOriginal: number; priceRental: number; priceSale: number; priceMonthly: number; priceYearly: number;
    features: Array<{ text: string; included: boolean }>;
    faq: Array<{ q: string; a: string }>;
    addons: AddonDef[] | null; planOptions: PlanOption[] | null;
    meteredItems: Array<{ key: string; unitName: string; unitPrice: number }>;
    digitalAssets: Array<{ id: string; filename: string; size: number }>;
    plans: Array<{ plan: { id: string; name: string; price: number; cycle: string; trialDays: number } }>;
}

interface RelatedProduct { id: string; slug: string; name: string; icon: string | null; priceMonthly: number; tagline: string | null }

const TYPE_BADGE: Record<string, { emoji: string; bg: string; color: string; label: string }> = {
    CRM: { emoji: '🏢', bg: '#dbeafe', color: '#1e40af', label: 'CRM' },
    APP: { emoji: '📱', bg: '#ede9fe', color: '#5b21b6', label: 'App' },
    DIGITAL: { emoji: '📚', bg: '#fef3c7', color: '#92400e', label: 'Digital' },
};

export default function ProductDetailPage() {
    const params = useParams();
    const slug = params.slug as string;
    const router = useRouter();
    const searchParams = useSearchParams();
    const fromDemo = searchParams.get('src') === 'demo';
    const { success, error: toastError } = useToast();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [related, setRelated] = useState<RelatedProduct[]>([]);
    const [loading, setLoading] = useState(true);
    const [wallet, setWallet] = useState<{ balanceAvailable: number; creditBalance: number } | null>(null);
    const [purchasing, setPurchasing] = useState(false);

    // ── Checkout state ──
    const [cycle, setCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
    const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
    const [domain, setDomain] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [couponCode, setCouponCode] = useState('');

    useEffect(() => {
        if (!slug) return;
        Promise.all([
            fetch(`/api/hub/products/${slug}`).then(r => r.json()),
            fetch('/api/hub/wallet').then(r => r.json()),
        ]).then(([prodData, walData]) => {
            setProduct(prodData.product || null);
            if (walData?.balance !== undefined) {
                setWallet({ balanceAvailable: walData.balance, creditBalance: walData.creditBalance || 0 });
            }
            setLoading(false);
            if (prodData.product?.industry?.length) {
                fetch(`/api/hub/products?industry=${prodData.product.industry[0]}&limit=4`)
                    .then(r => r.json())
                    .then(d => setRelated((d.products || []).filter((p: RelatedProduct) => p.slug !== slug).slice(0, 3)))
                    .catch(() => { });
            }
        }).catch(() => setLoading(false));
    }, [slug]);

    // ── Price calculations ──
    const getBasePrice = () => {
        if (!product) return 0;
        if (product.billingModel === 'SUBSCRIPTION') {
            if (cycle === 'YEARLY') return product.priceYearly || Math.floor((product.priceRental || product.priceMonthly) * 12 * 0.83);
            return product.priceRental || product.priceMonthly;
        }
        if (product.billingModel === 'ONE_TIME') return product.priceSale || product.priceOriginal;
        return 0;
    };

    const getAddonTotal = () => {
        if (!product?.addons) return 0;
        let total = 0;
        for (const fk of selectedAddons) {
            const def = product.addons.find(a => a.featureKey === fk);
            if (def && def.billing === 'SUBSCRIPTION' && def.trialDays === 0) total += def.price;
        }
        return total;
    };

    const basePrice = getBasePrice();
    const addonTotal = getAddonTotal();
    const totalPrice = basePrice + addonTotal;
    const totalBalance = (wallet?.balanceAvailable || 0) + (wallet?.creditBalance || 0);
    const insufficient = totalPrice > totalBalance;
    const isCrm = product?.type === 'CRM';

    const toggleAddon = (fk: string) => {
        setSelectedAddons(prev => {
            const next = new Set(prev);
            if (next.has(fk)) next.delete(fk); else next.add(fk);
            return next;
        });
    };

    const handleCheckout = async () => {
        if (!product) return;
        if (isCrm && !domain.trim()) { toastError('Vui lòng nhập domain'); return; }
        setPurchasing(true);
        try {
            const res = await fetch('/api/hub/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productId: product.id,
                    planKey: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
                    addons: Array.from(selectedAddons),
                    cycle,
                    domain: isCrm ? domain.trim().toLowerCase() : undefined,
                    businessName: isCrm ? businessName.trim() : undefined,
                    adminEmail: isCrm ? adminEmail.trim() : undefined,
                    couponCode: couponCode.trim() || undefined,
                    idempotencyKey: `checkout_${product.id}_${Date.now()}`,
                }),
            });
            const data = await res.json();
            if (data.ok) {
                success(`Mua "${product.name}" thành công!`);
                if (data.setupUrl) router.push(data.setupUrl);
                else if (data.productType === 'DIGITAL') router.push('/hub/downloads');
                else router.push('/hub/orders');
            } else {
                if (data.code === 'INSUFFICIENT_BALANCE') toastError(`Cần ${vnd(data.required)} — Còn ${vnd(data.balance)}`);
                else toastError(data.error || 'Lỗi thanh toán');
            }
        } catch { toastError('Lỗi kết nối'); }
        setPurchasing(false);
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[1, 2, 3].map(i => <div key={i} className="emk-skeleton" style={{ height: i === 1 ? '140px' : '80px', borderRadius: '18px' }} />)}
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

    const tb = TYPE_BADGE[product.type] || TYPE_BADGE.CRM;
    const addons = product.addons || [];
    const hasAddons = addons.length > 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Back */}
            <button onClick={() => router.push('/hub/marketplace')} style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                fontSize: '14px', cursor: 'pointer', alignSelf: 'flex-start', fontFamily: 'inherit', padding: 0,
            }}>← Sản phẩm</button>

            {/* From demo banner */}
            {fromDemo && (
                <div style={{ padding: '10px 14px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white', fontSize: '13px', fontWeight: 600, textAlign: 'center' }}>
                    🎯 Bạn đến từ bản Demo — Triển khai ngay trên domain của bạn!
                </div>
            )}

            {/* Hero card */}
            <div style={{ padding: '18px', borderRadius: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={{ fontSize: '40px' }}>{product.icon || tb.emoji}</span>
                    <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>{product.name}</h1>
                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 700, background: tb.bg, color: tb.color }}>{tb.label}</span>
                        </div>
                        {product.tagline && <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, margin: 0 }}>{product.tagline}</p>}
                    </div>
                </div>
                {product.outcomeText && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 6px' }}>{product.outcomeText}</p>}
                {product.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{product.description}</p>}
                {/* Demo link */}
                {product.demoUrl && (
                    <a href={product.demoUrl} target="_blank" rel="noopener" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '10px',
                        padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                        background: 'var(--bg-hover)', color: 'var(--accent-primary)', textDecoration: 'none',
                    }}>🖥 Dùng thử Demo →</a>
                )}
            </div>

            {/* ──────── PLAN CYCLE TOGGLE ──────── */}
            {product.billingModel === 'SUBSCRIPTION' && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>📋 Chu kỳ thanh toán</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {['MONTHLY', 'YEARLY'].map(c => {
                            const isActive = cycle === c;
                            const label = c === 'MONTHLY' ? 'Hàng tháng' : 'Hàng năm';
                            const priceLabel = c === 'MONTHLY'
                                ? vnd(product.priceRental || product.priceMonthly) + '/th'
                                : vnd(product.priceYearly || Math.floor((product.priceRental || product.priceMonthly) * 12 * 0.83)) + '/năm';
                            return (
                                <button key={c} onClick={() => setCycle(c as 'MONTHLY' | 'YEARLY')} style={{
                                    flex: 1, padding: '12px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                                    border: isActive ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
                                    background: isActive ? 'rgba(99,102,241,0.06)' : 'transparent',
                                    transition: 'all 150ms',
                                }}>
                                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{label}</div>
                                    <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--accent-primary)', marginTop: '4px' }}>{priceLabel}</div>
                                    {c === 'YEARLY' && <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>🏷 Tiết kiệm ~17%</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ──────── ADDON PICKER ──────── */}
            {hasAddons && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>🧩 Tiện ích mở rộng (Add-on)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {addons.map(addon => {
                            const checked = selectedAddons.has(addon.featureKey);
                            const isTrial = addon.trialDays > 0 && addon.price > 0;
                            const isPAYG = addon.billing === 'PAYG';
                            const hasReqs = addon.requires && addon.requires.length > 0;
                            const reqsMet = !hasReqs || addon.requires!.every(r => selectedAddons.has(r));
                            return (
                                <button key={addon.featureKey} onClick={() => reqsMet && toggleAddon(addon.featureKey)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px',
                                    padding: '10px 12px', borderRadius: '10px', cursor: reqsMet ? 'pointer' : 'not-allowed',
                                    border: checked ? '2px solid var(--accent-primary)' : '1px solid var(--border)',
                                    background: checked ? 'rgba(99,102,241,0.05)' : 'transparent',
                                    opacity: reqsMet ? 1 : 0.5,
                                    fontFamily: 'inherit', width: '100%', textAlign: 'left',
                                    transition: 'all 150ms',
                                }}>
                                    <div style={{
                                        width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                                        border: checked ? '2px solid var(--accent-primary)' : '2px solid var(--border)',
                                        background: checked ? 'var(--accent-primary)' : 'transparent',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'white', fontSize: '11px', fontWeight: 700,
                                    }}>
                                        {checked && '✓'}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{addon.label}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>
                                            {isPAYG ? 'Trả theo lượt' :
                                                isTrial ? `Dùng thử ${addon.trialDays} ngày miễn phí` :
                                                    addon.price > 0 ? `${vnd(addon.price)}/tháng` : 'Miễn phí'}
                                            {hasReqs && !reqsMet && ` · Cần ${addon.requires!.join(', ')}`}
                                        </div>
                                    </div>
                                    {addon.price > 0 && !isPAYG && (
                                        <span style={{ fontWeight: 700, fontSize: '12px', color: isTrial ? '#059669' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                            {isTrial ? 'Free' : `+${vnd(addon.price)}`}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ──────── CRM: DOMAIN + BUSINESS ──────── */}
            {isCrm && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>🌐 Cấu hình triển khai</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Domain CRM *</label>
                            <input placeholder="crm.congtyban.com" value={domain} onChange={e => setDomain(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                                    border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit',
                                    fontSize: '14px', fontWeight: 600, boxSizing: 'border-box',
                                }} />
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>Nhập domain bạn muốn dùng. Bạn sẽ cần trỏ DNS sau.</div>
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Tên doanh nghiệp</label>
                            <input placeholder="Công ty ABC" value={businessName} onChange={e => setBusinessName(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                                    border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box',
                                }} />
                        </div>
                        <div>
                            <label style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', display: 'block' }}>Email quản trị</label>
                            <input placeholder="admin@congtyban.com" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} type="email"
                                style={{
                                    width: '100%', padding: '10px 12px', borderRadius: '10px',
                                    border: '1px solid var(--border)', background: 'var(--bg)', fontFamily: 'inherit', fontSize: '13px', boxSizing: 'border-box',
                                }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Features */}
            {product.features && product.features.length > 0 && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>✨ Bạn nhận được gì?</h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {product.features.map((f, i) => (
                            <li key={i} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', color: f.included ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                <span style={{ color: f.included ? '#059669' : 'var(--text-muted)', fontWeight: 700 }}>{f.included ? '✓' : '—'}</span>
                                <span style={{ textDecoration: f.included ? 'none' : 'line-through' }}>{f.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* FAQ */}
            {product.faq && product.faq.length > 0 && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>❓ Câu hỏi thường gặp</h2>
                    {product.faq.map((item, i) => (
                        <div key={i} style={{ marginBottom: i < product.faq.length - 1 ? '8px' : 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>❓ {item.q}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, paddingLeft: '20px' }}>{item.a}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Related */}
            {related.length > 0 && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px' }}>🔗 Sản phẩm liên quan</h3>
                    {related.map(rp => (
                        <button key={rp.id} onClick={() => router.push(`/hub/marketplace/${rp.slug}`)} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px',
                            border: '1px solid var(--border)', background: 'var(--bg-hover)', cursor: 'pointer',
                            fontFamily: 'inherit', width: '100%', textAlign: 'left', marginBottom: '6px',
                        }}>
                            <span style={{ fontSize: '22px' }}>{rp.icon || '📦'}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '13px' }}>{rp.name}</div>
                                {rp.tagline && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{rp.tagline}</div>}
                            </div>
                            <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-primary)' }}>{vnd(rp.priceMonthly)}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ──────── CHECKOUT SECTION ──────── */}
            {totalPrice > 0 && (
                <div style={{ padding: '14px', borderRadius: '16px', background: 'var(--bg-card)', border: '2px solid var(--accent-primary)' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 10px' }}>💳 Thanh toán</h3>

                    {/* Price summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>{product.name} ({cycle === 'YEARLY' ? 'năm' : 'tháng'})</span>
                            <span style={{ fontWeight: 600 }}>{vnd(basePrice)}</span>
                        </div>
                        {addonTotal > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Add-on ({selectedAddons.size})</span>
                                <span style={{ fontWeight: 600 }}>+{vnd(addonTotal)}</span>
                            </div>
                        )}
                        {selectedAddons.size > 0 && addons.filter(a => selectedAddons.has(a.featureKey) && a.trialDays > 0).length > 0 && (
                            <div style={{ fontSize: '10px', color: '#059669', fontWeight: 600 }}>
                                💚 {addons.filter(a => selectedAddons.has(a.featureKey) && a.trialDays > 0).length} add-on dùng thử miễn phí
                            </div>
                        )}
                    </div>

                    {/* Wallet */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-hover)', marginBottom: '8px', fontSize: '12px' }}>
                        <span>Số dư ví</span>
                        <span style={{ fontWeight: 700, color: insufficient ? '#dc2626' : '#059669' }}>
                            {wallet ? vnd(totalBalance) : 'Đang tải...'} {wallet?.creditBalance ? ` (${vnd(wallet.creditBalance)} credit)` : ''}
                        </span>
                    </div>
                    {insufficient && (
                        <div style={{ fontSize: '11px', color: '#dc2626', padding: '6px 10px', borderRadius: '8px', background: '#fee2e2', marginBottom: '8px' }}>
                            ⚠️ Cần thêm {vnd(totalPrice - totalBalance)}. <a href="/hub/wallet/topup" style={{ color: '#1e40af', fontWeight: 700 }}>Nạp tiền →</a>
                        </div>
                    )}

                    {/* Coupon */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
                        <input placeholder="Mã giảm giá" value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())}
                            style={{ flex: 1, padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border)', fontFamily: 'inherit', fontSize: '12px', background: 'var(--bg)', letterSpacing: '1px', fontWeight: 700 }} />
                    </div>

                    {/* Total */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 800, padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                        <span>Tổng</span>
                        <span style={{ color: 'var(--accent-primary)' }}>{vnd(totalPrice)}</span>
                    </div>
                </div>
            )}

            {/* Buy CTA */}
            <button onClick={handleCheckout} disabled={purchasing || (totalPrice > 0 && insufficient)} style={{
                width: '100%', padding: '16px', borderRadius: '16px',
                background: (purchasing || (totalPrice > 0 && insufficient)) ? 'var(--bg-hover)' : 'var(--accent-gradient)',
                border: 'none', color: (purchasing || (totalPrice > 0 && insufficient)) ? 'var(--text-muted)' : 'white',
                fontWeight: 700, fontSize: '16px',
                cursor: (purchasing || (totalPrice > 0 && insufficient)) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', boxShadow: (purchasing || (totalPrice > 0 && insufficient)) ? 'none' : 'var(--shadow-glow)',
                transition: 'all 200ms',
            }}>
                {purchasing ? '⏳ Đang xử lý…' :
                    isCrm ? `🚀 Triển khai CRM — ${vnd(totalPrice)}${cycle === 'YEARLY' ? '/năm' : '/tháng'}` :
                        totalPrice > 0 ? `💳 Mua ngay ${vnd(totalPrice)}` :
                            product.billingModel === 'PAYG' ? '🚀 Kích hoạt' : '✅ Áp dụng miễn phí'}
            </button>

            {isCrm && <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', margin: '0' }}>
                Sau thanh toán, bạn sẽ được hướng dẫn cấu hình DNS và triển khai CRM.
            </p>}
        </div>
    );
}
