export default function AdminDashboard() {
    return (
        <div>
            <div className="page-header">
                <h1>🛡️ Admin Dashboard</h1>
                <p>Tổng quan hệ thống eMarketer Hub</p>
            </div>
            <div className="grid grid-4">
                {[
                    { label: 'Tenants', icon: '🏢', href: '/admin/tenants', desc: 'Quản lý workspace & khách thuê' },
                    { label: 'Billing Ops', icon: '💳', href: '/admin/billing', desc: 'Đơn hàng, reconcile & xác nhận' },
                    { label: 'Provisioning', icon: '⚙️', href: '/admin/provisioning', desc: 'Log tạo workspace & retry' },
                    { label: 'Modules', icon: '📦', href: '/admin/modules', desc: 'CRUD module & giá' },
                ].map(item => (
                    <a key={item.href} href={item.href} className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)', textAlign: 'center', padding: '32px' }}>
                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>{item.icon}</div>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>{item.label}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item.desc}</p>
                    </a>
                ))}
            </div>
        </div>
    );
}
