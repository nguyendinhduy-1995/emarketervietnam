'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ModuleInfo {
    id: string; key: string; name: string; description: string;
    priceMonthly: number; icon: string; entitlementStatus: string | null;
}

export default function MarketplacePage() {
    const [modules, setModules] = useState<ModuleInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/modules').then(r => r.json()).then(d => { setModules(d.modules || []); setLoading(false); });
    }, []);

    const handleUpgrade = async (moduleKey: string) => {
        const res = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: [{ moduleKey, months: 1 }] }),
        });
        const data = await res.json();
        if (data.order) {
            router.push(`/billing/orders/${data.order.id}`);
        }
    };

    if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><div className="loading-spinner" /></div>;

    return (
        <div>
            <div className="page-header">
                <h1>🛒 Marketplace</h1>
                <p>Mở rộng CRM với các module chuyên nghiệp</p>
            </div>
            <div className="grid grid-3">
                {modules.map(m => (
                    <div key={m.id} className="module-card">
                        <div className="module-icon">{m.icon}</div>
                        <div className="module-name">{m.name}</div>
                        <div className="module-desc">{m.description}</div>
                        <div className="module-price">
                            {m.priceMonthly.toLocaleString('vi-VN')}₫ <span>/tháng</span>
                        </div>
                        <div style={{ marginTop: '16px' }}>
                            {m.entitlementStatus === 'ACTIVE' ? (
                                <span className="badge badge-success">✓ Đang hoạt động</span>
                            ) : (
                                <button onClick={() => handleUpgrade(m.key)} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                                    ⬆ Nâng cấp
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
