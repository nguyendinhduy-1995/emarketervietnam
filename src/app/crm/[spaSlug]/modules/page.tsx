'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

interface ModuleInfo {
    key: string; name: string; description: string; icon: string; priceMonthly: number;
    entitlement: { status: string; activeTo: string | null } | null;
}

export default function CrmModulesPage() {
    const { spaSlug } = useParams();
    const [modules, setModules] = useState<ModuleInfo[]>([]);
    const [upgradeUrl, setUpgradeUrl] = useState('');

    useEffect(() => {
        fetch(`/api/crm/${spaSlug}/modules`).then(r => r.json()).then(d => {
            setModules(d.modules || []);
            setUpgradeUrl(d.upgradeUrl || '/marketplace');
        });
    }, [spaSlug]);

    return (
        <div>
            <div className="page-header">
                <h1>📦 Modules</h1>
                <p>Xem trạng thái module và nâng cấp</p>
            </div>
            <div className="grid grid-3">
                {modules.map(m => (
                    <div key={m.key} className="module-card">
                        <div className="module-icon">{m.icon}</div>
                        <div className="module-name">{m.name}</div>
                        <div className="module-desc">{m.description}</div>
                        <div className="module-price">{m.priceMonthly.toLocaleString('vi-VN')}₫ <span>/tháng</span></div>
                        <div style={{ marginTop: '16px' }}>
                            {m.entitlement?.status === 'ACTIVE' ? (
                                <div>
                                    <span className="badge badge-success">✓ Active</span>
                                    {m.entitlement.activeTo && (
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            HSD: {new Date(m.entitlement.activeTo).toLocaleDateString('vi-VN')}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <a href={upgradeUrl} className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                                    ⬆ Nâng cấp tại Hub
                                </a>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
