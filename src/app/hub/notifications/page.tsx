'use client';
import { useEffect, useState } from 'react';

interface Notification { id: string; type: string; title: string; body: string; referenceType: string | null; referenceId: string | null; status: string; createdAt: string; readAt: string | null; }

const TYPE_ICON: Record<string, string> = {
    LOW_BALANCE: '⚠️', CHARGE_FAIL: '❌', SUB_EXPIRING: '⏰',
    ENTITLEMENT_GRANTED: '✅', DOWNLOAD_READY: '📥', REFUND_PROCESSED: '↩️',
};

export default function NotificationsPage() {
    const [notifs, setNotifs] = useState<Notification[]>([]);
    const [unread, setUnread] = useState(0);
    const [loading, setLoading] = useState(true);

    const load = () => {
        fetch('/api/hub/notifications').then(r => r.json()).then(d => {
            setNotifs(d.notifications || []); setUnread(d.unreadCount || 0); setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(load, []);

    const markRead = async (id?: string) => {
        await fetch('/api/hub/notifications', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(id ? { id } : { markAllRead: true }),
        });
        load();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 800, margin: 0, flex: 1 }}>🔔 Thông báo</h1>
                {unread > 0 && (
                    <>
                        <span style={{ padding: '2px 8px', borderRadius: '10px', background: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 700 }}>{unread} mới</span>
                        <button onClick={() => markRead()} style={{
                            padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-hover)', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700,
                        }}>✓ Đọc hết</button>
                    </>
                )}
            </div>

            {loading && <div style={{ height: '60px', borderRadius: '12px', background: 'var(--bg-card)' }} />}

            {!loading && notifs.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', borderRadius: '16px', background: 'var(--bg-card)' }}>
                    <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔔</p>
                    <p style={{ fontWeight: 600 }}>Không có thông báo</p>
                </div>
            )}

            {!loading && notifs.map(n => (
                <div key={n.id} onClick={() => n.status !== 'READ' && markRead(n.id)} style={{
                    padding: '12px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                    cursor: n.status !== 'READ' ? 'pointer' : 'default',
                    opacity: n.status === 'READ' ? 0.6 : 1,
                    borderLeft: n.status !== 'READ' ? '3px solid var(--accent-primary)' : '3px solid transparent',
                }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{TYPE_ICON[n.type] || '📢'}</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '13px', fontWeight: 700 }}>{n.title}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: '2px' }}>{n.body}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.createdAt).toLocaleString('vi')}</div>
                        </div>
                        {n.status !== 'READ' && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent-primary)', flexShrink: 0, marginTop: '4px' }} />}
                    </div>
                </div>
            ))}
        </div>
    );
}
