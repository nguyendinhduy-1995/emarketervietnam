'use client';
import { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';

interface WalletData {
    balance: number;
    currency: string;
    recentTopups: Array<{ id: string; amount: number; status: string; createdAt: string; method: string }>;
}

const TOPUP_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000];

const BANK_INFO = {
    bank: 'Vietcombank',
    accountNumber: '1234567890',
    accountName: 'CONG TY TNHH EMARKETER VIETNAM',
    branch: 'Hồ Chí Minh',
};

export default function WalletTopupPage() {
    const { success, error: toastError } = useToast();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [loading, setLoading] = useState(true);
    const [amount, setAmount] = useState(100000);
    const [customAmount, setCustomAmount] = useState('');
    const [transferring, setTransferring] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetch('/api/hub/wallet')
            .then(r => r.json())
            .then(d => { setWallet(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const selectedAmount = customAmount ? parseInt(customAmount) : amount;

    const handleStartTransfer = () => {
        if (!selectedAmount || selectedAmount < 10000) {
            toastError('Số tiền tối thiểu 10,000đ');
            return;
        }
        setShowQR(true);
    };

    const handleUploadProof = async () => {
        setUploading(true);
        try {
            const res = await fetch('/api/hub/billing/upload-proof', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: selectedAmount,
                    method: 'BANK_TRANSFER',
                    note: `Nạp ví ${selectedAmount.toLocaleString()}đ`,
                }),
            });
            if (res.ok) {
                success('✅ Đã ghi nhận! Admin sẽ xác nhận trong 1-24h.');
                setShowQR(false);
            } else {
                const data = await res.json();
                toastError(data.error || 'Lỗi ghi nhận');
            }
        } catch { toastError('Lỗi kết nối'); }
        setUploading(false);
    };

    const card: React.CSSProperties = {
        padding: '18px', borderRadius: '16px',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '14px',
    };
    const btn = (accent = false, disabled = false): React.CSSProperties => ({
        padding: '12px 20px', borderRadius: '12px', fontWeight: 700,
        background: accent ? 'var(--accent-gradient)' : 'var(--bg-input)',
        border: accent ? 'none' : '1px solid var(--border)',
        color: accent ? 'white' : 'var(--text-primary)',
        cursor: disabled ? 'wait' : 'pointer', fontSize: '14px', fontFamily: 'inherit',
        opacity: disabled ? 0.6 : 1, width: '100%',
    });

    if (loading) return (
        <div style={{ padding: '40px 0' }}>
            {[1, 2, 3].map(i => (<div key={i} className="emk-skeleton" style={{ height: '72px', marginBottom: '12px' }} />))}
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>💰 Nạp ví</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Nạp tiền vào ví để sử dụng dịch vụ</p>
            </div>

            {/* Balance */}
            <div style={{
                ...card, textAlign: 'center', padding: '24px',
                background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
                border: '1px solid rgba(99,102,241,0.15)',
            }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Số dư hiện tại</div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    {(wallet?.balance || 0).toLocaleString()}đ
                </div>
            </div>

            {!showQR ? (
                <>
                    {/* Amount Selection */}
                    <section>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                            Chọn số tiền
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                            {TOPUP_AMOUNTS.map(a => (
                                <button key={a} onClick={() => { setAmount(a); setCustomAmount(''); }} style={{
                                    padding: '14px', borderRadius: '12px', fontWeight: 700,
                                    background: amount === a && !customAmount ? 'var(--accent-primary)' : 'var(--bg-card)',
                                    color: amount === a && !customAmount ? 'white' : 'var(--text-primary)',
                                    border: `1px solid ${amount === a && !customAmount ? 'var(--accent-primary)' : 'var(--border)'}`,
                                    cursor: 'pointer', fontFamily: 'inherit', fontSize: '14px',
                                    transition: 'all 150ms ease',
                                }}>
                                    {a >= 1000000 ? `${a / 1000000}M` : `${a / 1000}K`}
                                </button>
                            ))}
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <input
                                type="number" placeholder="Hoặc nhập số tiền khác..."
                                value={customAmount}
                                onChange={e => { setCustomAmount(e.target.value); }}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px',
                                    background: 'var(--bg-input)', border: '1px solid var(--border)',
                                    color: 'var(--text-primary)', fontSize: '15px', fontFamily: 'inherit',
                                    outline: 'none', boxSizing: 'border-box',
                                }}
                            />
                        </div>
                    </section>

                    <button onClick={handleStartTransfer} style={btn(true)}>
                        Nạp {selectedAmount.toLocaleString()}đ →
                    </button>
                </>
            ) : (
                /* Bank Transfer Details */
                <section>
                    <div style={card}>
                        <div style={{ textAlign: 'center', padding: '16px', background: 'var(--bg-input)', borderRadius: '12px' }}>
                            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>🏦 Chuyển khoản ngân hàng</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-primary)' }}>
                                {selectedAmount.toLocaleString()}đ
                            </div>
                        </div>

                        <div style={{ fontSize: '14px', lineHeight: 1.8 }}>
                            <div><strong>Ngân hàng:</strong> {BANK_INFO.bank}</div>
                            <div><strong>Số TK:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>{BANK_INFO.accountNumber}</span></div>
                            <div><strong>Chủ TK:</strong> {BANK_INFO.accountName}</div>
                            <div><strong>Chi nhánh:</strong> {BANK_INFO.branch}</div>
                            <div><strong>Nội dung CK:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--accent-primary)' }}>EMK NAP {wallet?.balance !== undefined ? 'VID' : ''}</span></div>
                        </div>

                        <div style={{
                            padding: '12px', borderRadius: '10px', fontSize: '13px',
                            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)',
                            color: '#16a34a', textAlign: 'center',
                        }}>
                            💡 Sau khi chuyển khoản, bấm xác nhận bên dưới. Admin sẽ duyệt trong 1-24h.
                        </div>

                        <button onClick={handleUploadProof} disabled={uploading} style={btn(true, uploading)}>
                            {uploading ? 'Đang gửi...' : '✅ Tôi đã chuyển khoản'}
                        </button>

                        <button onClick={() => setShowQR(false)} style={btn(false)}>
                            ← Quay lại
                        </button>
                    </div>
                </section>
            )}

            {/* Recent Topups */}
            {wallet?.recentTopups && wallet.recentTopups.length > 0 && (
                <section>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
                        Lịch sử nạp
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {wallet.recentTopups.map(t => (
                            <div key={t.id} style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 16px', borderRadius: '12px',
                                background: 'var(--bg-card)', border: '1px solid var(--border)',
                            }}>
                                <span style={{ fontSize: '16px' }}>
                                    {t.status === 'CONFIRMED' ? '✅' : t.status === 'PENDING' ? '⏳' : '❌'}
                                </span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: '14px' }}>+{t.amount.toLocaleString()}đ</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {t.method} · {new Date(t.createdAt).toLocaleDateString('vi-VN')}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
}
