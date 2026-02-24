'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';
import { useToast } from '@/components/ToastProvider';

interface TopupRow {
    id: string;
    userId: string;
    amount: number;
    status: string;
    transferContent: string;
    createdAt: string;
    confirmedAt: string | null;
}

interface BankAccount {
    id: string;
    bankName: string;
    bankCode: string | null;
    bin: string | null;
    accountNumber: string;
    accountName: string;
    isActive: boolean;
    createdAt: string;
}

export default function AdminTopupsPage() {
    const [tab, setTab] = useState<'topups' | 'bank'>('topups');
    const [topups, setTopups] = useState<TopupRow[]>([]);
    const [banks, setBanks] = useState<BankAccount[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [confirming, setConfirming] = useState<string | null>(null);
    const [showAddBank, setShowAddBank] = useState(false);
    const [bankForm, setBankForm] = useState({ bankName: '', bankCode: '', bin: '', accountNumber: '', accountName: '' });
    const [saving, setSaving] = useState(false);
    const { success, error: toastError } = useToast();

    const loadTopups = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/topups')
            .then(r => r.json())
            .then(d => { setTopups(d.topups || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const loadBanks = useCallback(() => {
        fetch('/api/emk-crm/bank-accounts')
            .then(r => r.json())
            .then(d => setBanks(d.accounts || []))
            .catch(() => { });
    }, []);

    useEffect(() => { loadTopups(); loadBanks(); }, [loadTopups, loadBanks]);

    const handleConfirm = async (intentId: string) => {
        if (!confirm('Xác nhận nạp tiền cho yêu cầu này?')) return;
        setConfirming(intentId);
        try {
            const res = await fetch('/api/emk-crm/topups', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ intentId }),
            });
            const data = await res.json();
            if (res.ok) { success(data.message || 'Xác nhận thành công!'); loadTopups(); }
            else toastError(data.error || 'Lỗi xác nhận');
        } catch { toastError('Lỗi kết nối'); }
        setConfirming(null);
    };

    const handleAddBank = async () => {
        if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountName) {
            toastError('Vui lòng nhập đủ: Tên ngân hàng, Số TK, Chủ TK');
            return;
        }
        setSaving(true);
        try {
            const res = await fetch('/api/emk-crm/bank-accounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bankForm),
            });
            const data = await res.json();
            if (res.ok) {
                success(data.message || 'Thêm thành công!');
                setBankForm({ bankName: '', bankCode: '', bin: '', accountNumber: '', accountName: '' });
                setShowAddBank(false);
                loadBanks();
            } else toastError(data.error || 'Lỗi thêm tài khoản');
        } catch { toastError('Lỗi kết nối'); }
        setSaving(false);
    };

    const handleActivate = async (id: string) => {
        try {
            const res = await fetch('/api/emk-crm/bank-accounts', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, isActive: true }),
            });
            if (res.ok) { success('Đã kích hoạt!'); loadBanks(); }
        } catch { toastError('Lỗi kết nối'); }
    };

    const handleDeleteBank = async (id: string) => {
        if (!confirm('Xoá tài khoản ngân hàng này?')) return;
        try {
            const res = await fetch('/api/emk-crm/bank-accounts', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            if (res.ok) { success('Đã xoá!'); loadBanks(); }
            else toastError('Lỗi xoá');
        } catch { toastError('Lỗi kết nối'); }
    };

    const statusColor: Record<string, string> = {
        PENDING: '#f59e0b', CONFIRMED: '#22c55e', EXPIRED: '#9ca3af', CANCELED: '#ef4444',
    };
    const statusLabel: Record<string, string> = {
        PENDING: 'Đang chờ', CONFIRMED: 'Đã nạp', EXPIRED: 'Hết hạn', CANCELED: 'Đã huỷ',
    };

    const filtered = search
        ? topups.filter(t => t.transferContent.toLowerCase().includes(search.toLowerCase()))
        : topups;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => <div key={i} className="emk-skeleton" style={{ height: '56px' }} />)}
        </div>
    );

    const tabStyle = (active: boolean) => ({
        padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700 as const,
        border: 'none', cursor: 'pointer' as const, fontFamily: 'inherit',
        background: active ? 'var(--accent-primary)' : 'var(--bg-card)',
        color: active ? 'white' : 'var(--text-primary)',
    });

    const inputStyle = {
        padding: '10px 14px', borderRadius: '10px',
        border: '1px solid var(--border)', background: 'var(--bg-input)',
        fontSize: '13px', color: 'var(--text-primary)', width: '100%',
        fontFamily: 'inherit',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    Quản lý nạp tiền
                </h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Xác nhận nạp tiền & cấu hình tài khoản ngân hàng
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setTab('topups')} style={tabStyle(tab === 'topups')}>📥 Lệnh nạp tiền</button>
                <button onClick={() => setTab('bank')} style={tabStyle(tab === 'bank')}>🏦 Tài khoản NH</button>
            </div>

            {/* ═══════ TAB: Topups ═══════ */}
            {tab === 'topups' && (
                <>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Tìm theo nội dung CK..."
                        style={inputStyle}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {filtered.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '24px' }}>
                                Không tìm thấy
                            </div>
                        ) : filtered.map(t => (
                            <div key={t.id} style={{
                                padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)',
                                border: '1px solid var(--border)', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{vnd(t.amount)}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        <code>{t.transferContent}</code> · {new Date(t.createdAt).toLocaleString('vi-VN')}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {t.status === 'PENDING' && (
                                        <button
                                            onClick={() => handleConfirm(t.id)}
                                            disabled={confirming === t.id}
                                            style={{
                                                padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                                background: '#22c55e', color: 'white', border: 'none',
                                                cursor: confirming === t.id ? 'wait' : 'pointer',
                                                opacity: confirming === t.id ? 0.6 : 1, fontFamily: 'inherit',
                                            }}
                                        >
                                            {confirming === t.id ? '...' : '✓ Xác nhận'}
                                        </button>
                                    )}
                                    <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                        background: `${statusColor[t.status]}15`, color: statusColor[t.status],
                                    }}>
                                        {statusLabel[t.status] || t.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ═══════ TAB: Bank Accounts ═══════ */}
            {tab === 'bank' && (
                <>
                    {/* Active bank account highlight */}
                    {banks.filter(b => b.isActive).length > 0 && (
                        <div style={{
                            padding: '16px', borderRadius: '14px',
                            background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.08))',
                            border: '1px solid rgba(34,197,94,0.2)',
                        }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: '8px' }}>
                                ✅ Đang sử dụng (hiện trên Hub)
                            </div>
                            {banks.filter(b => b.isActive).map(b => (
                                <div key={b.id}>
                                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{b.bankName}</div>
                                    <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>{b.accountNumber}</div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{b.accountName}</div>
                                    {b.bankCode && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Mã NH: {b.bankCode} {b.bin ? `· BIN: ${b.bin}` : ''}</div>}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add button */}
                    <button
                        onClick={() => setShowAddBank(!showAddBank)}
                        style={{
                            padding: '10px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                            background: showAddBank ? 'var(--bg-card)' : 'var(--accent-primary)',
                            color: showAddBank ? 'var(--text-primary)' : 'white',
                            border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit',
                        }}
                    >
                        {showAddBank ? '✕ Đóng' : '+ Thêm tài khoản ngân hàng'}
                    </button>

                    {/* Add form */}
                    {showAddBank && (
                        <div style={{
                            padding: '16px', borderRadius: '14px', background: 'var(--bg-card)',
                            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px',
                        }}>
                            <div style={{ fontSize: '14px', fontWeight: 700 }}>Thêm tài khoản mới</div>
                            <input
                                value={bankForm.bankName} onChange={e => setBankForm(f => ({ ...f, bankName: e.target.value }))}
                                placeholder="Tên ngân hàng (VD: Vietcombank)" style={inputStyle}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <input
                                    value={bankForm.bankCode} onChange={e => setBankForm(f => ({ ...f, bankCode: e.target.value }))}
                                    placeholder="Mã VietQR (VD: VCB)" style={inputStyle}
                                />
                                <input
                                    value={bankForm.bin} onChange={e => setBankForm(f => ({ ...f, bin: e.target.value }))}
                                    placeholder="BIN (VD: 970436)" style={inputStyle}
                                />
                            </div>
                            <input
                                value={bankForm.accountNumber} onChange={e => setBankForm(f => ({ ...f, accountNumber: e.target.value }))}
                                placeholder="Số tài khoản" style={inputStyle}
                            />
                            <input
                                value={bankForm.accountName} onChange={e => setBankForm(f => ({ ...f, accountName: e.target.value }))}
                                placeholder="Tên chủ tài khoản" style={inputStyle}
                            />
                            <button
                                onClick={handleAddBank}
                                disabled={saving}
                                style={{
                                    padding: '12px 16px', borderRadius: '10px', fontSize: '14px', fontWeight: 700,
                                    background: '#22c55e', color: 'white', border: 'none',
                                    cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
                                    opacity: saving ? 0.6 : 1,
                                }}
                            >
                                {saving ? 'Đang lưu...' : '✓ Lưu & kích hoạt'}
                            </button>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                * Tài khoản mới sẽ tự động được kích hoạt. Tài khoản cũ sẽ bị tắt.
                            </div>
                        </div>
                    )}

                    {/* Bank list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {banks.filter(b => !b.isActive).length > 0 && (
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Tài khoản khác
                            </div>
                        )}
                        {banks.filter(b => !b.isActive).map(b => (
                            <div key={b.id} style={{
                                padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)',
                                border: '1px solid var(--border)', display: 'flex',
                                justifyContent: 'space-between', alignItems: 'center',
                            }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{b.bankName}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {b.accountNumber} · {b.accountName}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                        onClick={() => handleActivate(b.id)}
                                        style={{
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                            background: '#3b82f6', color: 'white', border: 'none',
                                            cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        Kích hoạt
                                    </button>
                                    <button
                                        onClick={() => handleDeleteBank(b.id)}
                                        style={{
                                            padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                                            background: '#ef444420', color: '#ef4444', border: 'none',
                                            cursor: 'pointer', fontFamily: 'inherit',
                                        }}
                                    >
                                        Xoá
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {banks.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏦</div>
                            <div style={{ fontWeight: 600 }}>Chưa có tài khoản ngân hàng</div>
                            <div style={{ fontSize: '13px', marginTop: '4px' }}>Thêm tài khoản để khách hàng nạp tiền qua QR</div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
