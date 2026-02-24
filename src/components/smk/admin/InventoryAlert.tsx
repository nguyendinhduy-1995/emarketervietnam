'use client';

import { useState, useEffect } from 'react';

interface AlertItem {
    productName: string;
    sku: string;
    currentStock: number;
    threshold: number;
    status: 'critical' | 'warning' | 'ok';
}

const DEMO_ALERTS: AlertItem[] = [
    { productName: 'Aviator Classic Gold', sku: 'RB-AVI-GOLD', currentStock: 2, threshold: 5, status: 'critical' },
    { productName: 'Cat-Eye Acetate', sku: 'TF-CAT-TORT', currentStock: 4, threshold: 5, status: 'warning' },
    { productName: 'Square TR90 Black', sku: 'OK-SQ-BLK', currentStock: 3, threshold: 5, status: 'critical' },
    { productName: 'Tròng chống xanh 1.56', sku: 'LENS-BLUE-156', currentStock: 8, threshold: 10, status: 'warning' },
];

export default function InventoryAlert() {
    const [alerts, setAlerts] = useState<AlertItem[]>([]);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    useEffect(() => {
        setAlerts(DEMO_ALERTS);
    }, []);

    const activeAlerts = alerts.filter(a => !dismissed.has(a.sku));

    if (activeAlerts.length === 0) return null;

    return (
        <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: '#ef4444' }}>
                    ⚠️ Cảnh báo tồn kho ({activeAlerts.length})
                </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {activeAlerts.map((alert) => (
                    <div
                        key={alert.sku}
                        style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                            background: alert.status === 'critical' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
                        }}
                    >
                        <div>
                            <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{alert.productName}</p>
                            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                                SKU: {alert.sku} · Ngưỡng: {alert.threshold}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <span style={{
                                fontSize: 'var(--text-lg)', fontWeight: 800,
                                color: alert.status === 'critical' ? '#ef4444' : '#f59e0b',
                            }}>
                                {alert.currentStock}
                            </span>
                            <button
                                onClick={() => setDismissed(prev => new Set(prev).add(alert.sku))}
                                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: 4 }}
                                title="Bỏ qua"
                            >✕</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
