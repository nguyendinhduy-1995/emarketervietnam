'use client';
import { useEffect, useState, useCallback } from 'react';

/* ═══ TYPES ═══ */
interface CrmInstance {
    subscriptionId: string;
    status: string;
    plan: string;
    startDate: string;
    endDate: string | null;
    product: { id: string; name: string; type: string; icon: string | null; key: string } | null;
    workspace: { id: string; name: string; slug: string; status: string; createdAt: string; userCount: number } | null;
    crm: { domain: string; crmUrl: string | null; status: string } | null;
    org: { id: string; name: string; status: string; owner: { id: string; name: string; phone: string; email: string | null } } | null;
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
    ACTIVE: { label: 'Đang hoạt động', color: '#059669', bg: '#d1fae5' },
    TRIAL: { label: 'Dùng thử', color: '#d97706', bg: '#fef3c7' },
    SUSPENDED: { label: 'Tạm ngưng', color: '#dc2626', bg: '#fee2e2' },
    CANCELED: { label: 'Đã hủy', color: '#6b7280', bg: '#f3f4f6' },
    EXPIRED: { label: 'Hết hạn', color: '#92400e', bg: '#fef3c7' },
};

export default function CrmProductsPage() {
    const [instances, setInstances] = useState<CrmInstance[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('ALL');

    const load = useCallback(async () => {
        const res = await fetch('/api/emk-crm/products/instances');
        if (res.ok) setInstances(await res.json());
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const filtered = filter === 'ALL' ? instances : instances.filter(i => i.status === filter);
    const activeCount = instances.filter(i => i.status === 'ACTIVE').length;
    const totalUsers = instances.reduce((s, i) => s + (i.workspace?.userCount || 0), 0);
    const withDomain = instances.filter(i => i.crm?.domain).length;

    return (
        <div style={{ padding: '16px', maxWidth: '1000px', margin: '0 auto' }}>
            {/* Header */}
            <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>🏢 CRM đã kích hoạt</h1>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Theo dõi các CRM khách hàng đang sử dụng · Hỗ trợ kỹ thuật
            </p>

            {loading && <div className="emk-skeleton" style={{ height: '100px', borderRadius: '12px' }} />}

            {!loading && (
                <>
                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                        {[
                            { icon: '🏢', value: instances.length, label: 'Tổng CRM', color: 'var(--accent-primary)' },
                            { icon: '✅', value: activeCount, label: 'Đang hoạt động', color: '#059669' },
                            { icon: '👥', value: totalUsers, label: 'Tổng người dùng', color: '#d97706' },
                            { icon: '🌐', value: withDomain, label: 'Có tên miền', color: '#6366f1' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px' }}>
                                <div style={{ fontSize: '20px', marginBottom: '4px' }}>{s.icon}</div>
                                <div style={{ fontSize: '22px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Filter */}
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                        {[{ k: 'ALL', l: 'Tất cả' }, { k: 'ACTIVE', l: '✅ Hoạt động' }, { k: 'TRIAL', l: '⏳ Dùng thử' }, { k: 'SUSPENDED', l: '⛔ Tạm ngưng' }].map(f => (
                            <button key={f.k} onClick={() => setFilter(f.k)} style={{
                                padding: '5px 12px', borderRadius: '14px', fontSize: '11px', fontWeight: 700,
                                border: '2px solid', cursor: 'pointer',
                                borderColor: filter === f.k ? 'var(--accent-primary)' : 'var(--border)',
                                background: filter === f.k ? 'var(--accent-primary)' : 'transparent',
                                color: filter === f.k ? '#fff' : 'var(--text-primary)',
                            }}>{f.l}</button>
                        ))}
                    </div>

                    {/* Instances List */}
                    {filtered.length === 0 ? (
                        <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
                            <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏢</div>
                            <p style={{ fontWeight: 600, fontSize: '14px' }}>Chưa có CRM nào được kích hoạt</p>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Khi khách hàng đăng ký sản phẩm CRM, dữ liệu sẽ hiển thị tại đây</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {filtered.map(inst => {
                                const ws = inst.workspace;
                                const org = inst.org;
                                const statusInfo = STATUS_MAP[inst.status] || STATUS_MAP.ACTIVE;
                                const crmDomain = inst.crm?.domain || (ws?.slug ? `${ws.slug}.emarketervietnam.vn` : null);

                                return (
                                    <div key={inst.subscriptionId} className="card" style={{
                                        padding: '14px', borderLeft: `4px solid ${statusInfo.color}`,
                                    }}>
                                        {/* Header */}
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                                            <span style={{ fontSize: '28px' }}>{inst.product?.icon || '🏢'}</span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                    <strong style={{ fontSize: '14px' }}>{ws?.name || org?.name || 'Không xác định'}</strong>
                                                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, background: statusInfo.bg, color: statusInfo.color }}>{statusInfo.label}</span>
                                                </div>
                                                {inst.product && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Sản phẩm: <strong>{inst.product.name}</strong></div>}
                                                {org?.owner && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chủ sở hữu: {org.owner.name} · {org.owner.phone}</div>}
                                            </div>
                                        </div>

                                        {/* Info grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginBottom: '10px' }}>
                                            <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Tên miền</div>
                                                <div style={{ fontSize: '12px', fontWeight: 600, color: crmDomain ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                                                    {crmDomain || 'Chưa cấu hình'}
                                                </div>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Người dùng</div>
                                                <div style={{ fontSize: '12px', fontWeight: 700, color: '#d97706' }}>{ws?.userCount || 0} người</div>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Gói</div>
                                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{inst.plan || 'Cơ bản'}</div>
                                            </div>
                                            <div style={{ padding: '8px 10px', borderRadius: '10px', background: 'var(--bg-hover)' }}>
                                                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Ngày kích hoạt</div>
                                                <div style={{ fontSize: '12px', fontWeight: 600 }}>{new Date(inst.startDate).toLocaleDateString('vi-VN')}</div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {crmDomain && (
                                                <a href={`https://${crmDomain}`} target="_blank" rel="noopener noreferrer"
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                                                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    }}>🔗 Truy cập CRM</a>
                                            )}
                                            {org?.owner?.phone && (
                                                <a href={`tel:${org.owner.phone}`}
                                                    style={{
                                                        padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                                        background: '#d1fae5', color: '#065f46',
                                                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    }}>📞 Gọi hỗ trợ</a>
                                            )}
                                            <a href={`/emk-crm/accounts/${org?.owner?.id || ''}`}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
                                                    background: 'var(--bg-hover)', color: 'var(--text-secondary)',
                                                    textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    border: '1px solid var(--border)',
                                                }}>👤 Xem tài khoản</a>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
