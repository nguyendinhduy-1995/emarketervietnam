'use client';

/**
 * NotificationCenter — bell icon with unread badge + dropdown
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
    id: string;
    type: 'order' | 'return' | 'payout' | 'stock' | 'fraud';
    title: string;
    detail: string;
    link: string;
    time: string;
    read: boolean;
}

const TYPE_ICONS: Record<string, string> = {
    order: '🧾', return: '↩️', payout: '🏦', stock: '📦', fraud: '🛡️',
};

const TYPE_COLORS: Record<string, string> = {
    order: '#60a5fa', return: '#f59e0b', payout: '#22c55e', stock: '#ef4444', fraud: '#a855f7',
};

export default function NotificationCenter() {
    const [open, setOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/smk/admin/dashboard');
            const data = await res.json();

            const notifs: Notification[] = [];

            // Pending orders
            if (data.pendingOrders?.length > 0) {
                data.pendingOrders.forEach((o: { code: string; total: number; user?: { name?: string } }) => {
                    notifs.push({
                        id: `order-${o.code}`,
                        type: 'order',
                        title: `Đơn mới: ${o.code}`,
                        detail: `${o.user?.name || 'Khách'} — ${new Intl.NumberFormat('vi-VN').format(o.total)}₫`,
                        link: '/admin/orders',
                        time: 'Vừa tạo',
                        read: false,
                    });
                });
            }

            // Payout requests
            if (data.payoutRequests?.length > 0) {
                data.payoutRequests.forEach((p: { id: string; amount: number; partner?: { partnerCode?: string } }) => {
                    notifs.push({
                        id: `payout-${p.id}`,
                        type: 'payout',
                        title: 'Yêu cầu rút tiền',
                        detail: `${p.partner?.partnerCode || '?'} — ${new Intl.NumberFormat('vi-VN').format(p.amount)}₫`,
                        link: '/admin/payouts',
                        time: 'Chờ duyệt',
                        read: false,
                    });
                });
            }

            // Fraud alerts
            if (data.partnerAlerts?.length > 0) {
                data.partnerAlerts.forEach((a: { id: string; flaggedScore: number; partner?: { partnerCode?: string } }) => {
                    notifs.push({
                        id: `fraud-${a.id}`,
                        type: 'fraud',
                        title: `Cảnh báo gian lận`,
                        detail: `${a.partner?.partnerCode || '?'} — Score: ${a.flaggedScore}`,
                        link: '/admin/fraud',
                        time: 'Cần xử lý',
                        read: false,
                    });
                });
            }

            // Low stock (fake for demo since we don't have a dedicated endpoint)
            if (data.lowStockCount > 0) {
                notifs.push({
                    id: 'stock-low',
                    type: 'stock',
                    title: 'Tồn kho thấp',
                    detail: `${data.lowStockCount} sản phẩm cần nhập thêm`,
                    link: '/admin/warehouse',
                    time: 'Kiểm tra',
                    read: false,
                });
            }

            setNotifications(notifs);
        } catch {
            // Use demo data on error
            setNotifications([
                { id: 'demo-1', type: 'order', title: 'Đơn mới: SMK-0042', detail: 'Nguyễn Văn A — 4.590.000₫', link: '/admin/orders', time: '2 phút trước', read: false },
                { id: 'demo-2', type: 'return', title: 'Yêu cầu đổi trả', detail: 'RMA-00005 — Kính bị xước', link: '/admin/returns', time: '15 phút trước', read: false },
                { id: 'demo-3', type: 'payout', title: 'Rút tiền chờ duyệt', detail: 'DUY123 — 1.500.000₫', link: '/admin/payouts', time: '1 giờ trước', read: true },
                { id: 'demo-4', type: 'stock', title: 'Tồn kho thấp', detail: 'Cat Eye Retro Pink — còn 2', link: '/admin/warehouse', time: 'Hôm nay', read: true },
            ]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (open) fetchNotifications();
    }, [open, fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;
    const markRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

    const handleClick = (n: Notification) => {
        markRead(n.id);
        setOpen(false);
        router.push(n.link);
    };

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} className="zen-notif-bell"
                style={{
                    background: 'none', border: 'none', cursor: 'pointer', position: 'relative',
                    padding: 'var(--space-2)', borderRadius: 'var(--radius-md)',
                    fontSize: 20, lineHeight: 1, color: 'var(--text-secondary)',
                }}>
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 2, right: 2,
                        width: 18, height: 18, borderRadius: '50%',
                        background: '#ef4444', color: '#fff',
                        fontSize: 10, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid var(--bg-primary)',
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {open && (
                <div className="zen-notif-dropdown" style={{
                    position: 'absolute', top: '100%', right: 0, zIndex: 1000,
                    width: 320, maxHeight: 420, overflowY: 'auto',
                    background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-xl)', boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                    marginTop: 'var(--space-2)',
                }}>
                    <div style={{
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--border-primary)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>Thông báo</span>
                        {unreadCount > 0 && (
                            <button onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                                style={{ background: 'none', border: 'none', color: 'var(--gold-400)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Đánh dấu đã đọc
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Đang tải...</div>
                    ) : notifications.length === 0 ? (
                        <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>🎉 Không có thông báo mới</div>
                    ) : notifications.map(n => (
                        <button key={n.id} onClick={() => handleClick(n)}
                            style={{
                                display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
                                width: '100%', padding: 'var(--space-3) var(--space-4)',
                                border: 'none', borderBottom: '1px solid var(--border-secondary)',
                                background: n.read ? 'transparent' : 'rgba(212,168,83,0.04)',
                                cursor: 'pointer', textAlign: 'left',
                                transition: 'background 150ms ease',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(212,168,83,0.04)')}>
                            <span style={{
                                width: 32, height: 32, borderRadius: 'var(--radius-md)',
                                background: `${TYPE_COLORS[n.type]}15`, color: TYPE_COLORS[n.type],
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 16, flexShrink: 0,
                            }}>{TYPE_ICONS[n.type]}</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: n.read ? 500 : 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{n.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.detail}</div>
                            </div>
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>{n.time}</span>
                            {!n.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--gold-400)', flexShrink: 0, marginTop: 4 }} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
