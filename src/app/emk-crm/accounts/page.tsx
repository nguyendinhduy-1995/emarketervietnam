'use client';
import { useEffect, useState, useCallback } from 'react';

interface HubAccount {
    id: string; name: string; email: string | null; phone: string;
    status: string; createdAt: string; updatedAt: string;
    walletBalance: number;
    workspaces: Array<{ id: string; name: string; slug: string; status: string; role: string }>;
}

import { vnd } from '@/lib/format';

export default function CrmAccountsPage() {
    const [accounts, setAccounts] = useState<HubAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState<HubAccount | null>(null);
    const [msg, setMsg] = useState('');
    const [saving, setSaving] = useState(false);

    // Create/Edit forms
    const [showCreate, setShowCreate] = useState(false);
    const [editForm, setEditForm] = useState<{ name: string; phone: string; email: string; password: string }>({ name: '', phone: '', email: '', password: '' });
    const [walletForm, setWalletForm] = useState({ amount: '', direction: 'CREDIT' as 'CREDIT' | 'DEBIT', reason: '' });

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/accounts').then(r => r.json()).then(d => {
            setAccounts(d.accounts || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    const doAction = async (action: string, data: Record<string, unknown>) => {
        setSaving(true);
        const res = await fetch('/api/emk-crm/accounts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, ...data }),
        });
        const d = await res.json();
        setMsg(d.message || d.error || 'Đã xử lý');
        setSaving(false);
        setShowCreate(false);
        load();
        // Refresh selected if still open
        if (selected) {
            setTimeout(() => {
                fetch('/api/emk-crm/accounts').then(r => r.json()).then(d => {
                    const updated = (d.accounts || []).find((a: HubAccount) => a.id === selected.id);
                    setSelected(updated || null);
                });
            }, 300);
        }
    };

    const filtered = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.phone.includes(search) ||
        (a.email && a.email.toLowerCase().includes(search.toLowerCase()))
    );

    const activeCount = filtered.filter(a => a.status === 'ACTIVE').length;
    const totalWallet = filtered.reduce((sum, a) => sum + a.walletBalance, 0);

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: '90px', borderRadius: '14px', background: 'var(--bg-card)',  }} />)}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    Tài khoản Hub
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    {filtered.length} tài khoản · {activeCount} hoạt động · Tổng ví: {vnd(totalWallet)}
                </p>
            </div>

            {/* Message */}
            {msg && (
                <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    {msg}
                    <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'inherit' }}>✕</button>
                </div>
            )}

            {/* Search + Create */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <input
                    type="text" placeholder="🔍 Tìm theo tên, SĐT, email..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    style={{
                        flex: 1, padding: '10px 14px', borderRadius: '12px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                    }}
                />
                <button onClick={() => { setShowCreate(true); setEditForm({ name: '', phone: '', email: '', password: '' }); }} style={{
                    padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontSize: '13px',
                    whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>+ Tạo mới</button>
            </div>

            {/* Create Form */}
            {showCreate && (
                <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '2px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>➕ Tạo user Hub mới</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                        <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Họ tên *" style={inputSt} />
                        <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="SĐT *" style={inputSt} />
                        <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" style={inputSt} />
                        <input value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="Mật khẩu *" type="password" style={inputSt} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={() => setShowCreate(false)} style={btnSecSt}>Huỷ</button>
                        <button disabled={saving} onClick={() => doAction('create', editForm)} style={btnPriSt}>
                            {saving ? 'Đang tạo...' : 'Tạo user Hub'}
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Selected User Detail Panel ─── */}
            {selected && (
                <div style={{ padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '2px solid var(--accent-primary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0 }}>📋 {selected.name}</h3>
                        <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}>✕</button>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        <span>📱 {selected.phone}</span>
                        {selected.email && <span>✉️ {selected.email}</span>}
                        <span>💰 {vnd(selected.walletBalance)}</span>
                        <span style={{ color: selected.status === 'ACTIVE' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                            {selected.status === 'ACTIVE' ? '🟢 Hoạt động' : '🔴 Đã khóa'}
                        </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button onClick={() => {
                            setEditForm({ name: selected.name, phone: selected.phone, email: selected.email || '', password: '' });
                        }} style={{ ...btnActionSt, color: '#3b82f6', borderColor: '#3b82f620' }}>✏️ Sửa</button>
                        <button onClick={() => {
                            const pw = prompt('Mật khẩu mới cho: ' + selected.name);
                            if (pw) doAction('reset-password', { userId: selected.id, password: pw });
                        }} style={{ ...btnActionSt, color: '#f59e0b', borderColor: '#f59e0b20' }}>🔑 Reset MK</button>
                        <button disabled={saving} onClick={() => doAction('toggle-status', { userId: selected.id })} style={{ ...btnActionSt, color: selected.status === 'ACTIVE' ? '#ef4444' : '#22c55e', borderColor: selected.status === 'ACTIVE' ? '#ef444420' : '#22c55e20' }}>
                            {selected.status === 'ACTIVE' ? '🔒 Khóa' : '🔓 Mở khóa'}
                        </button>
                        <button onClick={() => {
                            if (confirm(`Xóa vĩnh viễn ${selected.name}? Không thể hoàn tác!`))
                                doAction('delete', { userId: selected.id }).then(() => setSelected(null));
                        }} style={{ ...btnActionSt, color: '#ef4444', borderColor: '#ef444420' }}>🗑️ Xóa</button>
                    </div>

                    {/* Edit form for selected */}
                    {editForm.name && selected && editForm.phone === selected.phone && (
                        <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#3b82f6' }}>✏️ Chỉnh sửa thông tin</div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '6px' }}>
                                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="Họ tên" style={inputSt} />
                                <input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="SĐT" style={inputSt} />
                                <input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" style={inputSt} />
                            </div>
                            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditForm({ name: '', phone: '', email: '', password: '' })} style={btnSecSt}>Huỷ</button>
                                <button disabled={saving} onClick={() => doAction('update', { userId: selected.id, name: editForm.name, email: editForm.email, phone: editForm.phone })} style={btnPriSt}>
                                    {saving ? 'Lưu...' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Wallet Adjust */}
                    <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.15)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#22c55e' }}>💰 Điều chỉnh ví · Số dư hiện tại: {vnd(selected.walletBalance)}</div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                <button onClick={() => setWalletForm({ ...walletForm, direction: 'CREDIT' })} style={{
                                    padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                                    background: walletForm.direction === 'CREDIT' ? '#22c55e' : 'var(--bg-card)',
                                    color: walletForm.direction === 'CREDIT' ? 'white' : 'var(--text-muted)',
                                }}>+ Cộng</button>
                                <button onClick={() => setWalletForm({ ...walletForm, direction: 'DEBIT' })} style={{
                                    padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 700, fontFamily: 'inherit',
                                    background: walletForm.direction === 'DEBIT' ? '#ef4444' : 'var(--bg-card)',
                                    color: walletForm.direction === 'DEBIT' ? 'white' : 'var(--text-muted)',
                                }}>- Trừ</button>
                            </div>
                            <input value={walletForm.amount} onChange={e => setWalletForm({ ...walletForm, amount: e.target.value })} placeholder="Số tiền (đ)" type="number" style={{ ...inputSt, width: '120px', flex: 'none' }} />
                            <input value={walletForm.reason} onChange={e => setWalletForm({ ...walletForm, reason: e.target.value })} placeholder="Lý do *" style={{ ...inputSt, flex: 1, minWidth: '140px' }} />
                            <button disabled={saving || !walletForm.amount || !walletForm.reason} onClick={() => {
                                doAction('wallet-adjust', {
                                    userId: selected.id,
                                    amount: parseInt(walletForm.amount),
                                    direction: walletForm.direction,
                                    reason: walletForm.reason,
                                });
                                setWalletForm({ amount: '', direction: 'CREDIT', reason: '' });
                            }} style={{ ...btnPriSt, background: walletForm.direction === 'CREDIT' ? '#22c55e' : '#ef4444' }}>
                                {saving ? '...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>

                    {/* Workspaces */}
                    {selected.workspaces.length > 0 && (
                        <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '6px' }}>🏢 Workspace ({selected.workspaces.length})</div>
                            {selected.workspaces.map(ws => (
                                <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '12px' }}>
                                    <span style={{ color: ws.status === 'ACTIVE' ? '#22c55e' : '#f59e0b' }}>●</span>
                                    <span style={{ fontWeight: 600 }}>{ws.name}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>({ws.slug})</span>
                                    <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', background: 'var(--bg-primary)', padding: '2px 6px', borderRadius: '4px' }}>
                                        {ws.role === 'OWNER' ? 'Chủ' : ws.role}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─── User List ─── */}
            {filtered.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 20px', borderRadius: '16px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>👥</div>
                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>{search ? 'Không tìm thấy' : 'Chưa có tài khoản nào'}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                        {search ? 'Thử từ khóa khác' : 'Bấm "Tạo mới" để thêm user Hub'}
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filtered.map(acc => (
                        <div key={acc.id} onClick={() => { setSelected(acc); setEditForm({ name: '', phone: '', email: '', password: '' }); setWalletForm({ amount: '', direction: 'CREDIT', reason: '' }); }}
                            style={{
                                padding: '14px 16px', borderRadius: '14px', cursor: 'pointer',
                                background: selected?.id === acc.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-card)',
                                border: `1px solid ${selected?.id === acc.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                                transition: 'all 150ms ease',
                            }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        color: 'white', fontSize: '13px', fontWeight: 700,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {acc.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{acc.name}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            📱 {acc.phone}{acc.email ? ` · ✉️ ${acc.email}` : ''}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                    <span style={{ fontWeight: 700, fontSize: '13px', color: acc.walletBalance > 0 ? '#22c55e' : 'var(--text-muted)' }}>
                                        {vnd(acc.walletBalance)}
                                    </span>
                                    <span style={{
                                        width: '8px', height: '8px', borderRadius: '50%',
                                        background: acc.status === 'ACTIVE' ? '#22c55e' : '#ef4444',
                                    }} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// Shared styles
const inputSt: React.CSSProperties = {
    padding: '8px 12px', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'var(--bg-input, var(--bg-card))', color: 'var(--text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
};
const btnPriSt: React.CSSProperties = {
    padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
    background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontSize: '13px', fontFamily: 'inherit',
};
const btnSecSt: React.CSSProperties = {
    padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--border)',
    background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'inherit',
};
const btnActionSt: React.CSSProperties = {
    padding: '6px 12px', borderRadius: '8px', border: '1px solid', cursor: 'pointer',
    background: 'transparent', fontSize: '12px', fontWeight: 600, fontFamily: 'inherit',
};
