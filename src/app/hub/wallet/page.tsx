'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';

interface LedgerEntry {
    id: string; type: string; amount: number; direction: string;
    refType: string; note: string | null; createdAt: string;
}
interface PendingTopup {
    id: string; amount: number; status: string;
    transferContent: string; qrPayload: string | null;
    expiresAt: string | null; createdAt: string;
}

const QUICK_AMOUNTS = [100000, 200000, 500000, 1000000];

export default function WalletPage() {
    const [balance, setBalance] = useState(0);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);
    const [pendingTopups, setPendingTopups] = useState<PendingTopup[]>([]);
    const [loading, setLoading] = useState(true);

    // Topup flow
    const [step, setStep] = useState<'view' | 'amount' | 'qr'>('view');
    const [topupAmount, setTopupAmount] = useState(0);
    const [currentIntent, setCurrentIntent] = useState<PendingTopup | null>(null);
    const [bankInfo, setBankInfo] = useState<{ bankName: string; accountNumber: string; accountName: string } | null>(null);
    const [creating, setCreating] = useState(false);
    const [polling, setPolling] = useState(false);

    const loadWallet = useCallback(() => {
        setLoading(true);
        fetch('/api/hub/wallet')
            .then(r => r.json())
            .then(d => {
                setBalance(d.balance || 0);
                setLedger(d.ledger || []);
                setPendingTopups(d.pendingTopups || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);
    useEffect(loadWallet, [loadWallet]);

    // Check URL params for topupAmount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const amt = params.get('topupAmount');
        if (amt) {
            setTopupAmount(parseInt(amt));
            setStep('amount');
        }
    }, []);

    // Polling for intent status
    useEffect(() => {
        if (!currentIntent || currentIntent.status !== 'PENDING') return;
        setPolling(true);
        const interval = setInterval(() => {
            fetch(`/api/hub/wallet/topup-intents/${currentIntent.id}`)
                .then(r => r.json())
                .then(d => {
                    if (d.status === 'CONFIRMED') {
                        setCurrentIntent({ ...currentIntent, status: 'CONFIRMED' });
                        setPolling(false);
                        loadWallet();
                        clearInterval(interval);
                    } else if (d.status === 'EXPIRED') {
                        setCurrentIntent({ ...currentIntent, status: 'EXPIRED' });
                        setPolling(false);
                        clearInterval(interval);
                    }
                });
        }, 5000); // Poll mỗi 5 giây
        return () => { clearInterval(interval); setPolling(false); };
    }, [currentIntent, loadWallet]);

    const createTopup = async () => {
        if (topupAmount < 100000) return;
        setCreating(true);
        try {
            const r = await fetch('/api/hub/wallet/topup-intents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: topupAmount }),
            });
            const d = await r.json();
            if (d.topupIntent) {
                setCurrentIntent(d.topupIntent);
                setBankInfo(d.bankAccount);
                setStep('qr');
            }
        } catch { /* silent */ }
        setCreating(false);
    };

    const fmtMoney = vnd;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '80px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'wPulse 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes wPulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>💰 Ví tiền</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Nạp tiền và thanh toán dịch vụ
                </p>
            </div>

            {/* Balance Card */}
            <div style={{
                padding: '24px', borderRadius: '18px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', fontSize: '80px', opacity: 0.1 }}>💰</div>
                <div style={{ fontSize: '12px', opacity: 0.8, fontWeight: 600 }}>Số dư khả dụng</div>
                <div style={{ fontSize: '32px', fontWeight: 800, marginTop: '4px' }}>{fmtMoney(balance)}</div>
                <button
                    onClick={() => setStep('amount')}
                    style={{
                        marginTop: '16px', padding: '10px 24px', borderRadius: '10px',
                        background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                        color: 'white', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    ➕ Nạp tiền
                </button>
            </div>

            {/* Step: Amount */}
            {step === 'amount' && (
                <div style={{
                    padding: '20px', borderRadius: '16px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px' }}>Chọn số tiền nạp</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '12px' }}>
                        {QUICK_AMOUNTS.map(amt => (
                            <button key={amt} onClick={() => setTopupAmount(amt)} style={{
                                padding: '12px', borderRadius: '10px', fontWeight: 700, fontSize: '14px',
                                background: topupAmount === amt ? 'var(--accent-primary)' : 'var(--bg-input)',
                                color: topupAmount === amt ? 'white' : 'var(--text-primary)',
                                border: `1px solid ${topupAmount === amt ? 'var(--accent-primary)' : 'var(--border)'}`,
                                cursor: 'pointer', transition: 'all 150ms',
                            }}>
                                {fmtMoney(amt)}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <input
                            type="number"
                            value={topupAmount || ''}
                            onChange={e => setTopupAmount(parseInt(e.target.value) || 0)}
                            placeholder="Hoặc nhập số tiền..."
                            min={100000}
                            step={10000}
                            style={{
                                flex: 1, padding: '10px 14px', borderRadius: '10px',
                                border: '1px solid var(--border)', background: 'var(--bg-input)',
                                fontSize: '14px', color: 'var(--text-primary)',
                            }}
                        />
                    </div>

                    {topupAmount > 0 && topupAmount < 100000 && (
                        <p style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>
                            ⚠️ Nạp tối thiểu 100.000đ
                        </p>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => setStep('view')} style={{
                            flex: 1, padding: '10px', borderRadius: '10px', fontWeight: 600,
                            background: 'var(--bg-input)', border: '1px solid var(--border)', cursor: 'pointer',
                        }}>Huỷ</button>
                        <button
                            onClick={createTopup}
                            disabled={topupAmount < 100000 || creating}
                            style={{
                                flex: 2, padding: '10px', borderRadius: '10px', fontWeight: 700,
                                background: topupAmount >= 100000 ? 'var(--accent-primary)' : 'var(--border)',
                                color: topupAmount >= 100000 ? 'white' : 'var(--text-muted)',
                                border: 'none', cursor: topupAmount >= 100000 ? 'pointer' : 'default',
                            }}
                        >
                            {creating ? 'Đang tạo...' : 'Tạo mã QR nạp tiền'}
                        </button>
                    </div>
                </div>
            )}

            {/* Step: QR Display */}
            {step === 'qr' && currentIntent && (
                <div style={{
                    padding: '20px', borderRadius: '16px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)', textAlign: 'center',
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>
                        {currentIntent.status === 'CONFIRMED' ? '✅ Nạp thành công!' : '📱 Quét QR để nạp tiền'}
                    </h2>

                    {currentIntent.status === 'CONFIRMED' ? (
                        <div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#22c55e', margin: '16px 0' }}>
                                +{fmtMoney(currentIntent.amount)}
                            </div>
                            <button onClick={() => { setStep('view'); loadWallet(); }} style={{
                                padding: '10px 24px', borderRadius: '10px', fontWeight: 700,
                                background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer',
                            }}>Đóng</button>
                        </div>
                    ) : currentIntent.status === 'EXPIRED' ? (
                        <div>
                            <p style={{ color: '#ef4444', fontSize: '14px', margin: '16px 0' }}>⏰ Mã QR đã hết hạn</p>
                            <button onClick={() => setStep('amount')} style={{
                                padding: '10px 24px', borderRadius: '10px', fontWeight: 700,
                                background: 'var(--accent-primary)', color: 'white', border: 'none', cursor: 'pointer',
                            }}>Tạo lại</button>
                        </div>
                    ) : (
                        <>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                                Sử dụng app ngân hàng để quét mã QR bên dưới
                            </p>

                            {/* QR Image from VietQR */}
                            {currentIntent.qrPayload && (
                                <div style={{ margin: '0 auto 16px', maxWidth: '280px' }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={currentIntent.qrPayload}
                                        alt="QR nạp tiền"
                                        style={{ width: '100%', borderRadius: '12px', border: '1px solid var(--border)' }}
                                    />
                                </div>
                            )}

                            {/* Transfer details */}
                            <div style={{
                                padding: '14px', borderRadius: '12px', background: 'var(--bg-input)',
                                textAlign: 'left', fontSize: '13px', marginBottom: '14px',
                            }}>
                                {bankInfo && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Ngân hàng</span>
                                            <span style={{ fontWeight: 700 }}>{bankInfo.bankName}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Số TK</span>
                                            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{bankInfo.accountNumber}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                            <span style={{ color: 'var(--text-muted)' }}>Chủ TK</span>
                                            <span style={{ fontWeight: 700 }}>{bankInfo.accountName}</span>
                                        </div>
                                    </>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Số tiền</span>
                                    <span style={{ fontWeight: 800, color: '#6366f1' }}>{fmtMoney(currentIntent.amount)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Nội dung CK</span>
                                    <span style={{
                                        fontWeight: 800, fontFamily: 'monospace', color: '#ef4444',
                                        background: '#fef2f2', padding: '2px 8px', borderRadius: '4px',
                                    }}>
                                        {currentIntent.transferContent}
                                    </span>
                                </div>
                            </div>

                            {/* Polling status */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                fontSize: '12px', color: 'var(--text-muted)',
                            }}>
                                {polling && <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>}
                                <span>Đang chờ ghi có...</span>
                            </div>
                            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

                            <button onClick={() => setStep('view')} style={{
                                marginTop: '14px', padding: '8px 20px', borderRadius: '8px',
                                background: 'var(--bg-input)', border: '1px solid var(--border)',
                                cursor: 'pointer', fontSize: '12px',
                            }}>← Quay lại</button>
                        </>
                    )}
                </div>
            )}

            {/* Pending Topups */}
            {pendingTopups.length > 0 && step === 'view' && (
                <div style={{
                    padding: '14px', borderRadius: '14px', background: 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.2)',
                }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '8px' }}>
                        ⏳ Đang chờ nạp tiền
                    </div>
                    {pendingTopups.map(t => (
                        <div key={t.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            fontSize: '12px', padding: '4px 0',
                        }}>
                            <span>{fmtMoney(t.amount)} – <code style={{ fontSize: '11px' }}>{t.transferContent}</code></span>
                            <button onClick={() => { setCurrentIntent(t); setStep('qr'); }} style={{
                                padding: '4px 10px', borderRadius: '6px', fontSize: '11px',
                                background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600,
                            }}>Xem QR</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Transaction History */}
            {step === 'view' && (
                <div style={{
                    padding: '16px', borderRadius: '14px', background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 14px' }}>📋 Lịch sử giao dịch</h2>

                    {ledger.length === 0 ? (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0' }}>
                            Chưa có giao dịch nào
                        </p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {ledger.map(l => (
                                <div key={l.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 12px', borderRadius: '10px', background: 'var(--bg-input)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '13px', fontWeight: 600 }}>
                                            {l.direction === 'CREDIT' ? '➕' : '➖'} {formatRefType(l.refType)}
                                        </div>
                                        {l.note && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.note}</div>}
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontSize: '14px', fontWeight: 700,
                                            color: l.direction === 'CREDIT' ? '#22c55e' : '#ef4444',
                                        }}>
                                            {l.direction === 'CREDIT' ? '+' : '-'}{fmtMoney(l.amount)}
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                            {new Date(l.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function formatRefType(refType: string): string {
    const MAP: Record<string, string> = {
        'TOPUP_CONFIRMED': 'Nạp tiền',
        'TOPUP_INTENT': 'Đang nạp',
        'PURCHASE': 'Mua hàng',
        'SUBSCRIPTION': 'Gói dịch vụ',
        'MINIAPP_USAGE': 'Sử dụng miniapp',
        'MANUAL_ADJUST': 'Điều chỉnh',
    };
    return MAP[refType] || refType;
}
