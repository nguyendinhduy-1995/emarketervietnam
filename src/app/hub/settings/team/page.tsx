'use client';
import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/components/ToastProvider';

interface Member {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    joinedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Chủ sở hữu',
    ADMIN: 'Quản lý',
    STAFF: 'Nhân viên',
};

export default function TeamPage() {
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvite, setShowInvite] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('STAFF');
    const [inviting, setInviting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [changingRole, setChangingRole] = useState<string | null>(null);
    const { success, error: toastError } = useToast();

    const fetchMembers = useCallback(() => {
        fetch('/api/hub/team')
            .then(r => r.json())
            .then(d => { setMembers(d.members || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    useEffect(() => { fetchMembers(); }, [fetchMembers]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) { toastError('Vui lòng nhập email'); return; }
        setInviting(true);
        try {
            const res = await fetch('/api/hub/team', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
            });
            const data = await res.json();
            if (res.ok) {
                success('Đã mời thành viên!');
                setInviteEmail('');
                setShowInvite(false);
                fetchMembers();
            } else {
                toastError(data.error || 'Không thể mời');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setInviting(false);
    };

    const handleChangeRole = async (membershipId: string, newRole: string) => {
        setChangingRole(membershipId);
        try {
            const res = await fetch('/api/hub/team', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ membershipId, role: newRole }),
            });
            const data = await res.json();
            if (res.ok) {
                success('Đã đổi vai trò!');
                fetchMembers();
            } else {
                toastError(data.error || 'Không thể đổi vai trò');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
        setChangingRole(null);
    };

    const handleDelete = async (membershipId: string) => {
        try {
            const res = await fetch(`/api/hub/team?id=${membershipId}`, { method: 'DELETE' });
            const data = await res.json();
            if (res.ok) {
                success('Đã xoá thành viên');
                setConfirmDelete(null);
                fetchMembers();
            } else {
                toastError(data.error || 'Không thể xoá');
            }
        } catch {
            toastError('Lỗi kết nối');
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Thành viên</h1>
                    <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                        {members.length > 0 ? `${members.length} thành viên` : 'Quản lý đội ngũ'}
                    </p>
                </div>
                <button onClick={() => setShowInvite(!showInvite)} style={{
                    background: 'var(--accent-gradient)', color: 'white',
                    border: 'none', borderRadius: '14px', padding: '10px 18px',
                    fontWeight: 600, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: 'var(--shadow-glow)',
                }}>
                    + Mời
                </button>
            </div>

            {/* Invite Form */}
            {showInvite && (
                <div style={{
                    padding: '18px', borderRadius: '16px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    animation: 'fadeIn 150ms ease',
                }}>
                    <input
                        autoFocus type="email" placeholder="Email người được mời"
                        value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleInvite()}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit', outline: 'none',
                        }}
                    />
                    <select
                        value={inviteRole} onChange={e => setInviteRole(e.target.value)}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
                        }}
                    >
                        <option value="STAFF">Nhân viên</option>
                        <option value="ADMIN">Quản lý</option>
                    </select>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setShowInvite(false)} style={{
                            flex: 1, padding: '12px', borderRadius: '12px', fontWeight: 600,
                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                            cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
                        }}>Huỷ</button>
                        <button onClick={handleInvite} disabled={inviting} style={{
                            flex: 2, padding: '12px', borderRadius: '12px', fontWeight: 700,
                            background: 'var(--accent-gradient)', border: 'none', color: 'white',
                            cursor: inviting ? 'wait' : 'pointer', fontFamily: 'inherit',
                            opacity: inviting ? 0.6 : 1,
                        }}>
                            {inviting ? 'Đang mời…' : 'Gửi lời mời'}
                        </button>
                    </div>
                </div>
            )}

            {/* Members List */}
            {loading ? (
                [1, 2].map(i => (
                    <div key={i} className="emk-skeleton" style={{ height: '80px' }} />
                ))
            ) : members.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '48px 24px', borderRadius: '20px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>👥</div>
                    <p style={{ fontWeight: 600 }}>Chưa có thành viên nào</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Mời đồng nghiệp để cùng quản lý</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map(m => (
                        <div key={m.id} style={{
                            padding: '14px 16px', borderRadius: '16px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{m.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.email}</div>
                                </div>
                                {m.role === 'OWNER' ? (
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                                        background: 'rgba(99,102,241,0.12)', color: 'var(--accent-primary)',
                                    }}>
                                        {ROLE_LABELS.OWNER}
                                    </span>
                                ) : (
                                    <select
                                        value={m.role}
                                        onChange={e => handleChangeRole(m.id, e.target.value)}
                                        disabled={changingRole === m.id}
                                        style={{
                                            padding: '4px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                            background: 'var(--bg-input)', border: '1px solid var(--border)',
                                            color: 'var(--text-secondary)', fontFamily: 'inherit',
                                            cursor: changingRole === m.id ? 'wait' : 'pointer',
                                        }}
                                    >
                                        <option value="ADMIN">Quản lý</option>
                                        <option value="STAFF">Nhân viên</option>
                                    </select>
                                )}
                            </div>

                            {/* Actions (non-OWNER only) */}
                            {m.role !== 'OWNER' && (
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    {confirmDelete === m.id ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Xác nhận xoá?</span>
                                            <button onClick={() => handleDelete(m.id)} style={{
                                                padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                                background: 'var(--danger)', color: 'white', border: 'none',
                                                cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
                                            }}>Xoá</button>
                                            <button onClick={() => setConfirmDelete(null)} style={{
                                                padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                                cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text-primary)',
                                            }}>Huỷ</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfirmDelete(m.id)} style={{
                                            padding: '4px 12px', borderRadius: '8px', fontSize: '12px',
                                            background: 'none', border: '1px solid rgba(239,68,68,0.3)',
                                            color: 'var(--danger)', cursor: 'pointer', fontFamily: 'inherit',
                                        }}>
                                            Xoá
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

        </div>
    );
}
