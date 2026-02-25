'use client';

/**
 * DemoCTA — Floating "Mua & Triển khai" banner for demo instances.
 * Shows a fixed bottom banner with CTA linking to Hub marketplace.
 *
 * Usage in demo layout:
 *   <DemoCTA productKey="CRM_SPA_PRO" productName="CRM Spa Pro" />
 */

interface DemoCTAProps {
    productKey: string;
    productName?: string;
    hubUrl?: string;
}

export default function DemoCTA({
    productKey,
    productName = 'CRM',
    hubUrl = 'https://hub.emarketervietnam.vn',
}: DemoCTAProps) {
    const href = `${hubUrl}/hub/marketplace/${productKey.toLowerCase().replace(/_/g, '-')}?src=demo`;

    return (
        <>
            {/* Floating bottom banner */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                padding: '10px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px',
                boxShadow: '0 -4px 20px rgba(99,102,241,0.3)',
            }}>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: 500 }}>
                    🎯 Bạn đang dùng bản Demo {productName}
                </span>
                <a
                    href={href}
                    style={{
                        background: '#fff', color: '#6366f1',
                        padding: '6px 16px', borderRadius: '8px',
                        fontWeight: 700, fontSize: '13px',
                        textDecoration: 'none',
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        transition: 'transform 150ms',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                    }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                >
                    🚀 Mua & Triển khai lên domain của bạn →
                </a>
            </div>

            {/* Sidebar CTA (optional, for CRM layout sidebar) */}
            <a
                href={href}
                className="demo-cta-sidebar"
                style={{
                    display: 'block', margin: '8px 12px', padding: '10px 12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#fff', textDecoration: 'none', textAlign: 'center',
                    fontSize: '12px', fontWeight: 700,
                    transition: 'opacity 150ms',
                }}
                onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                onMouseOut={e => (e.currentTarget.style.opacity = '1')}
            >
                🛒 Triển khai CRM riêng
            </a>

            {/* Bottom padding so content doesn't overlap the floating CTA */}
            <div style={{ height: '48px' }} />
        </>
    );
}
