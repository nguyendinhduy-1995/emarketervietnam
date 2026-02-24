'use client';
import { useEffect, useState, useCallback } from 'react';

interface UserItem {
    id: string; name: string; email: string | null; phone: string;
    emkRole: string | null; status: string; isAdmin: boolean;
    createdAt: string; updatedAt: string;
    _count: { eventLogs: number; emkTasksOwned: number };
}
interface LogItem { id: string; type: string; payloadJson: { detail?: string } | null; createdAt: string; actor: { id: string; name: string } | null }

const ROLES = ['ADMIN', 'OPS', 'SALES', 'CS'];
const ROLE_VN: Record<string, string> = { ADMIN: 'Quản trị viên', OPS: 'Vận hành', SALES: 'Kinh doanh', CS: 'Hỗ trợ KH' };
const ROLE_COLORS: Record<string, string> = { ADMIN: '#ef4444', OPS: '#8b5cf6', SALES: '#3b82f6', CS: '#22c55e' };

export default function UsersPage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [logs, setLogs] = useState<LogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [tab, setTab] = useState<'users' | 'logs'>('users');
    const [editing, setEditing] = useState<Partial<UserItem & { password?: string }> | null>(null);
    const [creating, setCreating] = useState(false);
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (filterRole) params.set('role', filterRole);
        if (filterStatus) params.set('status', filterStatus);
        fetch(`/api/emk-crm/users?${params}`)
            .then(r => r.json())
            .then(d => { setUsers(d.users || []); setLogs(d.recentLogs || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, [search, filterRole, filterStatus]);
    useEffect(load, [load]);

    const doAction = async (action: string, data: Record<string, unknown>) => {
        setSaving(true);
        const res = await fetch('/api/emk-crm/users', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data }),
        });
        const d = await res.json();
        setMsg(d.message || d.error || 'Đã xử lý');
        setSaving(false);
        setEditing(null); setCreating(false);
        load();
    };

    const SvgIcon = ({ name, sz = 18, col = 'var(--accent-primary)' }: { name: string; sz?: number; col?: string }) => {
        const p = { width: sz, height: sz, viewBox: '0 0 24 24', fill: 'none', stroke: col, strokeWidth: '2', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
        switch (name) {
            case 'users': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
            case 'search': return <svg {...p}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
            case 'plus': return <svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
            case 'log': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
            case 'shield': return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
            case 'key': return <svg {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>;
            default: return null;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <SvgIcon name="shield" sz={22} /> Nhân sự CRM
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Nhân viên nội bộ eMarketer · Phân quyền ADMIN/OPS/SALES/CS
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card)', borderRadius: '12px', padding: '4px', border: '1px solid var(--border)' }}>
                {(['users', 'logs'] as const).map(t => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                        border: 'none', cursor: 'pointer', transition: 'all 200ms ease',
                        background: tab === t ? 'var(--accent-primary)' : 'transparent',
                        color: tab === t ? 'white' : 'var(--text-muted)',
                    }}>
                        {t === 'users' ? `Người dùng (${users.length})` : `Nhật ký (${logs.length})`}
                    </button>
                ))}
            </div>

            {/* Message */}
            {msg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    {msg}
                    <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
            )}

            {tab === 'users' && (
                <>
                    {/* Search + Filter + Create */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm tên, SĐT, email..." className="form-input" style={{ paddingLeft: '36px' }} />
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}><SvgIcon name="search" sz={14} col="var(--text-muted)" /></div>
                        </div>
                        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '100px' }}>
                            <option value="">Tất cả vai trò</option>
                            {ROLES.map(r => <option key={r} value={r}>{ROLE_VN[r]}</option>)}
                        </select>
                        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="form-input" style={{ width: 'auto', minWidth: '100px' }}>
                            <option value="">Tất cả trạng thái</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="DISABLED">Đã khóa</option>
                        </select>
                        <button onClick={() => { setCreating(true); setEditing({ name: '', phone: '', email: '', password: '', emkRole: 'CS', status: 'ACTIVE' }); }}
                            style={{ padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}>
                            <SvgIcon name="plus" sz={14} col="white" /> Tạo mới
                        </button>
                    </div>

                    {/* Create/Edit Form */}
                    {editing && (
                        <div style={{ padding: '20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>{creating ? 'Tạo người dùng mới' : `Chỉnh sửa: ${editing.name}`}</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                                <input value={editing.name || ''} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Họ tên *" className="form-input" />
                                <input value={editing.phone || ''} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="Số điện thoại *" className="form-input" />
                                <input value={editing.email || ''} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="Email" className="form-input" />
                                <input value={editing.password || ''} onChange={e => setEditing({ ...editing, password: e.target.value })} placeholder={creating ? 'Mật khẩu *' : 'Mật khẩu mới (để trống = không đổi)'} type="password" className="form-input" />
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>Vai trò:</span>
                                {ROLES.map(r => (
                                    <button key={r} onClick={() => setEditing({ ...editing, emkRole: r })} style={{
                                        padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
                                        border: `1px solid ${ROLE_COLORS[r]}30`,
                                        background: editing.emkRole === r ? `${ROLE_COLORS[r]}15` : 'transparent',
                                        color: editing.emkRole === r ? ROLE_COLORS[r] : 'var(--text-muted)',
                                    }}>{ROLE_VN[r]}</button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button onClick={() => { setEditing(null); setCreating(false); }} style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Huỷ</button>
                                <button disabled={saving} onClick={() => {
                                    if (creating) {
                                        doAction('create', { name: editing.name, phone: editing.phone, email: editing.email, password: editing.password, emkRole: editing.emkRole });
                                    } else {
                                        doAction('update', { userId: editing.id, name: editing.name, email: editing.email, emkRole: editing.emkRole, password: editing.password || undefined });
                                    }
                                }} style={{ padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 700, background: 'var(--accent-primary)', color: 'white' }}>
                                    {saving ? 'Đang lưu...' : (creating ? 'Tạo' : 'Lưu')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* User list */}
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {[1, 2, 3].map(i => <div key={i} style={{ height: '70px', borderRadius: '14px', background: 'var(--bg-card)',  }} />)}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {users.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                    <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><SvgIcon name="users" sz={32} col="var(--text-muted)" /></div>
                                    <div style={{ fontSize: '14px', fontWeight: 600 }}>Không tìm thấy người dùng</div>
                                </div>
                            ) : users.map(u => {
                                const roleColor = ROLE_COLORS[u.emkRole || ''] || '#6b7280';
                                return (
                                    <div key={u.id} style={{
                                        padding: '14px 16px', borderRadius: '14px',
                                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        opacity: u.status === 'DISABLED' ? 0.55 : 1,
                                        transition: 'all 200ms ease',
                                    }}>
                                        <div style={{
                                            width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                            background: `${roleColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '16px', fontWeight: 800, color: roleColor,
                                        }}>{u.name.charAt(0).toUpperCase()}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {u.name}
                                                {u.isAdmin && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: '#ef444415', color: '#ef4444' }}>ADMIN</span>}
                                                {u.status === 'DISABLED' && <span style={{ padding: '1px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800, background: '#9ca3af15', color: '#9ca3af' }}>KHÓA</span>}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {u.phone} · {u.email || 'Chưa có email'}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                {u._count.emkTasksOwned} công việc · {u._count.eventLogs} nhật ký
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            {u.emkRole && <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: `${roleColor}12`, color: roleColor }}>{ROLE_VN[u.emkRole]}</span>}
                                            <button onClick={() => setEditing(u)} style={{
                                                padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                                                background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--accent-primary)',
                                            }}>Sửa</button>
                                            <button onClick={() => doAction('toggle-status', { userId: u.id })} style={{
                                                padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                                                background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600,
                                                color: u.status === 'ACTIVE' ? '#f59e0b' : '#22c55e',
                                            }}>{u.status === 'ACTIVE' ? 'Khóa' : 'Mở'}</button>
                                            <button onClick={() => {
                                                const pw = prompt('Mật khẩu mới:');
                                                if (pw) doAction('reset-password', { userId: u.id, password: pw });
                                            }} style={{
                                                padding: '5px 10px', borderRadius: '8px', border: '1px solid var(--border)',
                                                background: 'transparent', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)',
                                            }}>🔑</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Activity Log Tab */}
            {tab === 'logs' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {logs.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><SvgIcon name="log" sz={32} col="var(--text-muted)" /></div>
                            <div style={{ fontSize: '14px', fontWeight: 600 }}>Chưa có nhật ký</div>
                        </div>
                    ) : logs.map(log => {
                        const detail = (log.payloadJson as { detail?: string } | null)?.detail || '';
                        return (
                            <div key={log.id} style={{
                                padding: '12px 14px', borderRadius: '12px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                    <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                        <span style={{ color: 'var(--accent-primary)' }}>{log.actor?.name || 'System'}</span>
                                        {' · '}
                                        <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, background: 'var(--bg-input)' }}>{log.type}</span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {new Date(log.createdAt).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                {detail && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{detail}</div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
