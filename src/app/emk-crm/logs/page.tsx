'use client';
import { useEffect, useState } from 'react';

interface LogEntry {
    id: string; type: string; payloadJson: unknown; createdAt: string;
    actor: { name: string } | null;
    workspace: { name: string } | null;
}
interface ErrEntry {
    id: string; path: string | null; message: string; createdAt: string;
    user: { name: string } | null;
}

type Tab = 'events' | 'errors';

const EVENT_VN: Record<string, string> = {
    LOGIN: 'Đăng nhập', SIGNUP: 'Đăng ký', TRIAL_STARTED: 'Bắt đầu dùng thử',
    WORKSPACE_CREATED: 'Tạo không gian', LEAD_CREATED: 'Lead mới',
    PAYMENT_PROOF_UPLOADED: 'Upload chứng từ', SUBSCRIPTION_UPGRADED: 'Nâng cấp gói',
};

export default function LogsPage() {
    const [tab, setTab] = useState<Tab>('events');
    const [events, setEvents] = useState<LogEntry[]>([]);
    const [errors, setErrors] = useState<ErrEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        if (tab === 'events') {
            fetch('/api/admin/event-logs').then(r => r.json()).then(d => { setEvents(d.logs || []); setLoading(false); }).catch(() => { setEvents([]); setLoading(false); });
        } else {
            fetch('/api/admin/error-logs').then(r => r.json()).then(d => { setErrors(d.logs || []); setLoading(false); }).catch(() => { setErrors([]); setLoading(false); });
        }
    }, [tab]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg> Nhật ký hệ thống</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Theo dõi hoạt động và lỗi trên toàn hệ thống
                </p>
            </div>

            {/* Tabs */}
            <div style={{
                display: 'flex', gap: '4px', padding: '4px', borderRadius: '12px',
                background: 'var(--bg-card)', border: '1px solid var(--border)', width: 'fit-content',
            }}>
                {([['events', '📊 Sự kiện'], ['errors', '🚨 Lỗi']] as [Tab, string][]).map(([t, label]) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '8px 18px', borderRadius: '8px',
                        background: tab === t ? 'var(--accent-primary)' : 'transparent',
                        color: tab === t ? 'white' : 'var(--text-secondary)',
                        border: 'none', fontWeight: 600, fontSize: '13px',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 150ms ease',
                    }}>
                        {label}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1s linear infinite' }}>⏳</div>
                    <p style={{ margin: 0 }}>Đang tải dữ liệu...</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                </div>
            ) : tab === 'events' ? (
                events.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📊</div>
                        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Chưa có sự kiện nào</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                            Sự kiện sẽ được ghi lại khi có hoạt động trên hệ thống
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {events.map(e => (
                            <div key={e.id} style={{
                                padding: '12px 14px', borderRadius: '12px', fontSize: '13px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{
                                        fontWeight: 700, color: 'var(--accent-primary)',
                                        fontSize: '13px',
                                    }}>
                                        {EVENT_VN[e.type] || e.type}
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(e.createdAt).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                                    {e.actor && <span>👤 {e.actor.name}</span>}
                                    {e.workspace && <span>🏢 {e.workspace.name}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                errors.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>✅</div>
                        <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Không có lỗi nào</p>
                        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                            Hệ thống đang hoạt động bình thường
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {errors.map(e => (
                            <div key={e.id} style={{
                                padding: '12px 14px', borderRadius: '12px', fontSize: '13px',
                                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)',
                            }}>
                                <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: '4px' }}>{e.message}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                                    {e.path && <span>📍 {e.path}</span>}
                                    {e.user && <span>👤 {e.user.name}</span>}
                                    <span>🕐 {new Date(e.createdAt).toLocaleString('vi-VN')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}
