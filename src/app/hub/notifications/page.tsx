'use client';
import { useEffect, useState } from 'react';

interface Notification {
    id: string; title: string; body: string; type: string;
    read: boolean; createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hub/notifications')
            .then(r => r.json())
            .then(d => { setNotifications(d.notifications || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const markRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        fetch(`/api/hub/notifications/${id}`, { method: 'PATCH' }).catch(() => { });
    };

    const typeIcon: Record<string, string> = {
        'system': '⚙️', 'billing': '💰', 'update': '🔔', 'promo': '🎉',
    };

    if (loading) return (
        <div style={{ padding: '40px 0' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '64px', borderRadius: '14px', marginBottom: '10px', background: 'var(--bg-card)', border: '1px solid var(--border)',  }} />
            ))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Thông báo</h1>

            {notifications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔔</div>
                    <div style={{ fontSize: '15px', fontWeight: 600 }}>Chưa có thông báo</div>
                    <div style={{ fontSize: '13px', marginTop: '4px' }}>Bạn sẽ nhận thông báo khi có cập nhật mới</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {notifications.map(n => (
                        <div key={n.id} onClick={() => !n.read && markRead(n.id)} style={{
                            padding: '14px 16px', borderRadius: '14px',
                            background: n.read ? 'var(--bg-card)' : 'rgba(99,102,241,0.06)',
                            border: `1px solid ${n.read ? 'var(--border)' : 'rgba(99,102,241,0.15)'}`,
                            cursor: n.read ? 'default' : 'pointer',
                            transition: 'all 200ms ease',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '18px' }}>{typeIcon[n.type] || '🔔'}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: n.read ? 500 : 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {n.title}
                                        {!n.read && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0 }} />}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{n.body}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {new Date(n.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
