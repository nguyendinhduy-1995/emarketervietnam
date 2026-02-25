'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AdminStats {
    overview: {
        totalUsers: number; totalWorkspaces: number;
        activeSubscriptions: number; trialSubscriptions: number;
        totalOrders: number; monthOrders: number;
        monthRevenue: number; lastMonthRevenue: number;
        crmInstances: number; deployingInstances: number;
        pendingNotifications: number; totalProducts: number;
    };
    recentOrders: Array<{ id: string; total: number; status: string; createdAt: string }>;
    recentUsers: Array<{ id: string; name: string; email: string | null; createdAt: string }>;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/hub/admin/stats')
            .then(r => { if (!r.ok) throw new Error(r.status === 403 ? 'Không có quyền admin' : 'Lỗi'); return r.json(); })
            .then(d => { setStats(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, []);

    const card: React.CSSProperties = {
        padding: '18px', borderRadius: '16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
    };
    const label: React.CSSProperties = {
        fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px',
    };
    const statCard = (icon: string, labelText: string, value: number | string, accent = false): React.ReactNode => (
        <div style={{ ...card, textAlign: 'center' }}>
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{labelText}</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: accent ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );

    if (loading) return (
        <div style={{ padding: '40px 0' }}>
            {[1, 2, 3].map(i => (
                <div key={i} className="emk-skeleton" style={{ height: '72px', marginBottom: '12px' }} />
            ))}
        </div>
    );

    if (error) return (
        <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔒</div>
            <div style={{ fontSize: '16px', fontWeight: 600 }}>{error}</div>
            <Link href="/hub" style={{ color: 'var(--accent-primary)', fontSize: '14px' }}>← Về Hub</Link>
        </div>
    );

    if (!stats) return null;
    const o = stats.overview;
    const revenueGrowth = o.lastMonthRevenue > 0
        ? Math.round(((o.monthRevenue - o.lastMonthRevenue) / o.lastMonthRevenue) * 100)
        : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>🛡️ Admin Dashboard</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Quản lý nền tảng eMarketer Hub</p>
            </div>

            {/* Overview Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {statCard('👥', 'Users', o.totalUsers)}
                {statCard('🏢', 'Workspaces', o.totalWorkspaces)}
                {statCard('📦', 'Sản phẩm', o.totalProducts)}
                {statCard('✅', 'Sub Active', o.activeSubscriptions, true)}
                {statCard('🧪', 'Trial', o.trialSubscriptions)}
                {statCard('🖥️', 'CRM', o.crmInstances)}
            </div>

            {/* Revenue */}
            <section>
                <h2 style={label}>Doanh thu</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div style={{ ...card, textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tháng này</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                            {o.monthRevenue.toLocaleString()}đ
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {o.monthOrders} đơn hàng
                        </div>
                    </div>
                    <div style={{ ...card, textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Tăng trưởng</div>
                        <div style={{ fontSize: '22px', fontWeight: 800, color: revenueGrowth > 0 ? '#22c55e' : revenueGrowth < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                            {revenueGrowth > 0 ? '+' : ''}{revenueGrowth}%
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            vs tháng trước
                        </div>
                    </div>
                </div>
            </section>

            {/* Alerts */}
            {(o.deployingInstances > 0 || o.pendingNotifications > 5) && (
                <section>
                    <h2 style={label}>Cần xử lý</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {o.deployingInstances > 0 && (
                            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                                <span>⏳</span>
                                <span style={{ fontSize: '14px' }}>{o.deployingInstances} CRM đang chờ deploy</span>
                            </div>
                        )}
                        {o.pendingNotifications > 5 && (
                            <div style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                                <span>📬</span>
                                <span style={{ fontSize: '14px' }}>{o.pendingNotifications} thông báo chưa gửi</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Recent Orders */}
            <section>
                <h2 style={label}>Đơn hàng gần đây</h2>
                {stats.recentOrders.length === 0 ? (
                    <div style={{ ...card, textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>Chưa có đơn hàng</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {stats.recentOrders.map(order => {
                            const statusColors: Record<string, string> = { PAID: '#22c55e', PENDING: '#f59e0b', FAILED: '#ef4444' };
                            return (
                                <div key={order.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColors[order.status] || '#9ca3af' }} />
                                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, fontFamily: 'monospace' }}>
                                        {order.id.slice(-8)}
                                    </span>
                                    <span style={{ fontSize: '14px', fontWeight: 700 }}>{order.total.toLocaleString()}đ</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Recent Users */}
            <section>
                <h2 style={label}>Thành viên mới</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {stats.recentUsers.map(u => (
                        <div key={u.id} style={{ ...card, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '12px', fontWeight: 700,
                            }}>
                                {u.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.email || 'no email'}</div>
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Links */}
            <section>
                <h2 style={label}>Quản lý</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                        { icon: '📦', label: 'Sản phẩm', href: '/hub/marketplace', desc: 'Quản lý catalog' },
                        { icon: '📋', label: 'Đơn hàng', href: '/hub/orders', desc: 'Xem tất cả đơn' },
                        { icon: '🖥️', label: 'CRM Instances', href: '/hub/settings/domain', desc: 'Quản lý instances' },
                        { icon: '🩺', label: 'Health Check', href: '/hub/settings/health', desc: 'Kiểm tra hệ thống' },
                    ].map(item => (
                        <Link key={item.href} href={item.href} style={{
                            ...card, display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 16px', textDecoration: 'none', color: 'var(--text-primary)',
                        }}>
                            <span style={{ fontSize: '20px' }}>{item.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    );
}
