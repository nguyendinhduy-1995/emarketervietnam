'use client';
import { useEffect, useState, useCallback, useRef } from 'react';

interface Notification {
    id: string;
    type: string;
    icon: string;
    title: string;
    desc: string;
    time: string;
    read: boolean;
}

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const load = useCallback(() => {
        fetch('/api/hub/notifications')
            .then(r => r.json())
            .then(d => {
                setNotifications(d.notifications || []);
                setUnreadCount(d.unreadCount || 0);
            })
            .catch(() => { });
    }, []);

    useEffect(() => { load(); }, [load]);

    // Đóng dropdown khi click ngoài
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const timeAgo = (time: string) => {
        const diff = Date.now() - new Date(time).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '20px', position: 'relative', padding: '4px 8px',
                }}
                title="Thông báo"
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 0, right: 0,
                        background: '#ef4444', color: 'white',
                        fontSize: '10px', fontWeight: 800,
                        width: '16px', height: '16px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: '100%', right: 0,
                    width: '340px', maxHeight: '400px', overflowY: 'auto',
                    background: 'var(--bg-card, white)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: '14px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    zIndex: 1000,
                }}>
                    <div style={{
                        padding: '12px 16px', borderBottom: '1px solid var(--border, #e5e7eb)',
                        fontWeight: 700, fontSize: '14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span>🔔 Thông báo</span>
                        {unreadCount > 0 && (
                            <span style={{
                                fontSize: '11px', color: '#ef4444', fontWeight: 600,
                            }}>
                                {unreadCount} chưa đọc
                            </span>
                        )}
                    </div>

                    {notifications.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted, #9ca3af)', fontSize: '13px' }}>
                            Không có thông báo mới
                        </div>
                    ) : (
                        notifications.map(n => (
                            <div key={n.id} style={{
                                padding: '10px 16px',
                                borderBottom: '1px solid var(--border, #f3f4f6)',
                                background: n.read ? 'transparent' : 'rgba(99,102,241,0.03)',
                                cursor: 'default',
                            }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{n.icon}</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontSize: '13px',
                                            fontWeight: n.read ? 500 : 700,
                                            lineHeight: 1.3,
                                        }}>
                                            {n.title}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #9ca3af)', marginTop: '2px' }}>
                                            {n.desc} · {timeAgo(n.time)}
                                        </div>
                                    </div>
                                    {!n.read && (
                                        <span style={{
                                            width: '6px', height: '6px', borderRadius: '50%',
                                            background: '#6366f1', flexShrink: 0, marginTop: '6px',
                                        }} />
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
