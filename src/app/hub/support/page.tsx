'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

interface Ticket {
    id: string;
    subject: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    _count: { messages: number };
    messages: Array<{ content: string; isStaff: boolean; createdAt: string }>;
}

interface TicketDetail extends Ticket {
    messages: Array<{ id: string; content: string; isStaff: boolean; createdAt: string; author: { name: string } }>;
}

const CATEGORY_LABELS: Record<string, string> = { GENERAL: 'Chung', BILLING: 'Thanh toán', TECHNICAL: 'Kỹ thuật', ACCOUNT: 'Tài khoản' };
const PRIORITY_COLORS: Record<string, string> = { LOW: '#9ca3af', NORMAL: '#3b82f6', HIGH: '#f59e0b', URGENT: '#ef4444' };
const STATUS_COLORS: Record<string, string> = { OPEN: '#3b82f6', IN_PROGRESS: '#f59e0b', RESOLVED: '#22c55e', CLOSED: '#9ca3af' };
const STATUS_LABELS: Record<string, string> = { OPEN: 'Mở', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết', CLOSED: 'Đóng' };

export default function SupportPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<TicketDetail | null>(null);
    const [newSubject, setNewSubject] = useState('');
    const [newCategory, setNewCategory] = useState('GENERAL');
    const [newPriority, setNewPriority] = useState('NORMAL');
    const [newMessage, setNewMessage] = useState('');
    const [reply, setReply] = useState('');
    const [saving, setSaving] = useState(false);
    const msgEndRef = useRef<HTMLDivElement>(null);

    const loadTickets = useCallback(() => {
        setLoading(true);
        fetch('/api/hub/support').then(r => r.json()).then(d => { setTickets(d.tickets || []); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    useEffect(() => { loadTickets(); }, [loadTickets]);

    const loadDetail = useCallback((id: string) => {
        fetch(`/api/hub/support/${id}`).then(r => r.json()).then(d => {
            if (!d.error) { setDetail(d); setTimeout(() => msgEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }
        });
    }, []);

    useEffect(() => { if (selectedId) loadDetail(selectedId); }, [selectedId, loadDetail]);

    const createTicket = async () => {
        if (!newSubject.trim() || !newMessage.trim()) return;
        setSaving(true);
        const res = await fetch('/api/hub/support', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: newSubject, category: newCategory, priority: newPriority, message: newMessage }),
        });
        if (res.ok) {
            setShowNew(false);
            setNewSubject('');
            setNewCategory('GENERAL');
            setNewPriority('NORMAL');
            setNewMessage('');
            loadTickets();
        }
        setSaving(false);
    };

    const sendReply = async () => {
        if (!reply.trim() || !selectedId) return;
        setSaving(true);
        const res = await fetch(`/api/hub/support/${selectedId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: reply }),
        });
        if (res.ok) { setReply(''); loadDetail(selectedId); loadTickets(); }
        setSaving(false);
    };

    const fmtDate = (d: string) => new Date(d).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

    // Detail view
    if (selectedId && detail) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '680px', margin: '0 auto' }}>
                <button onClick={() => { setSelectedId(null); setDetail(null); }} style={{
                    background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer',
                    fontSize: '13px', fontWeight: 600, padding: 0, fontFamily: 'inherit', textAlign: 'left',
                    display: 'flex', alignItems: 'center', gap: '4px',
                }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg> Danh sách ticket
                </button>

                {/* Ticket header */}
                <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 8px' }}>{detail.subject}</h2>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <Badge label={CATEGORY_LABELS[detail.category] || detail.category} color="#6366f1" />
                        <Badge label={detail.priority} color={PRIORITY_COLORS[detail.priority] || '#999'} />
                        <Badge label={STATUS_LABELS[detail.status] || detail.status} color={STATUS_COLORS[detail.status] || '#999'} />
                    </div>
                </div>

                {/* Messages */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {detail.messages.map((m) => (
                        <div key={m.id} style={{
                            padding: '14px 16px', borderRadius: '16px',
                            background: m.isStaff ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                            border: `1px solid ${m.isStaff ? 'rgba(99,102,241,0.15)' : 'var(--border)'}`,
                            alignSelf: m.isStaff ? 'flex-start' : 'flex-end',
                            maxWidth: '90%',
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: m.isStaff ? '#6366f1' : 'var(--text-muted)', marginBottom: '4px' }}>
                                {m.isStaff ? '🛠 ' : ''}{m.author.name} · {fmtDate(m.createdAt)}
                            </div>
                            <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.content}</div>
                        </div>
                    ))}
                    <div ref={msgEndRef} />
                </div>

                {/* Reply */}
                {detail.status !== 'CLOSED' && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Nhập phản hồi…"
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                            style={{
                                flex: 1, padding: '12px 14px', borderRadius: '14px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
                            }}
                        />
                        <button onClick={sendReply} disabled={saving || !reply.trim()} style={{
                            padding: '12px 20px', borderRadius: '14px', fontWeight: 700, fontSize: '14px',
                            background: 'var(--accent-gradient)', border: 'none', color: 'white',
                            cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
                        }}>
                            Gửi
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '680px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        🎫 Hỗ trợ
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{tickets.length} tickets</p>
                </div>
                <button onClick={() => setShowNew(true)} style={{
                    padding: '10px 18px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                    background: 'var(--accent-gradient)', border: 'none', color: 'white',
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
                }}>
                    + Tạo ticket
                </button>
            </div>

            {/* New ticket form */}
            {showNew && (
                <div style={{ padding: '16px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Tạo ticket mới</h3>
                    <input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="Tiêu đề…"
                        style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <select value={newCategory} onChange={e => setNewCategory(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}>
                            <option value="GENERAL">Chung</option>
                            <option value="BILLING">Thanh toán</option>
                            <option value="TECHNICAL">Kỹ thuật</option>
                            <option value="ACCOUNT">Tài khoản</option>
                        </select>
                        <select value={newPriority} onChange={e => setNewPriority(e.target.value)}
                            style={{ flex: 1, padding: '10px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }}>
                            <option value="LOW">Thấp</option>
                            <option value="NORMAL">Bình thường</option>
                            <option value="HIGH">Cao</option>
                            <option value="URGENT">Khẩn cấp</option>
                        </select>
                    </div>
                    <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Mô tả chi tiết vấn đề…" rows={4}
                        style={{ padding: '10px 14px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowNew(false)} style={{ padding: '10px 16px', borderRadius: '12px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: '13px', fontWeight: 600 }}>
                            Hủy
                        </button>
                        <button onClick={createTicket} disabled={saving || !newSubject.trim() || !newMessage.trim()} style={{
                            padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '13px',
                            background: 'var(--accent-gradient)', border: 'none', color: 'white',
                            cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1,
                        }}>
                            {saving ? 'Đang gửi…' : 'Gửi ticket'}
                        </button>
                    </div>
                </div>
            )}

            {/* Ticket list */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[1, 2, 3].map(i => <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'stPulse 1.5s ease-in-out infinite' }} />)}
                    <style>{`@keyframes stPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
                </div>
            ) : tickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '36px', marginBottom: '8px' }}>🎫</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>Chưa có ticket nào</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>Tạo ticket để nhận hỗ trợ nhanh chóng</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tickets.map(t => {
                        const statusColor = STATUS_COLORS[t.status] || '#999';
                        const lastMsg = t.messages[0];
                        return (
                            <button key={t.id} onClick={() => setSelectedId(t.id)} style={{
                                padding: '14px 16px', borderRadius: '14px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', width: '100%',
                                transition: 'all 150ms ease', display: 'flex', flexDirection: 'column', gap: '6px',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>{t.subject}</span>
                                    <Badge label={STATUS_LABELS[t.status] || t.status} color={statusColor} />
                                </div>
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                                    <Badge label={CATEGORY_LABELS[t.category] || t.category} color="#6366f1" small />
                                    <Badge label={t.priority} color={PRIORITY_COLORS[t.priority] || '#999'} small />
                                    <span>· {t._count.messages} tin · {fmtDate(t.updatedAt)}</span>
                                </div>
                                {lastMsg && (
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {lastMsg.isStaff ? '🛠 ' : ''}
                                        {lastMsg.content.slice(0, 100)}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function Badge({ label, color, small }: { label: string; color: string; small?: boolean }) {
    return (
        <span style={{
            padding: small ? '2px 6px' : '3px 8px',
            borderRadius: '6px', fontSize: small ? '10px' : '11px', fontWeight: 700,
            background: `${color}15`, color,
        }}>
            {label}
        </span>
    );
}
