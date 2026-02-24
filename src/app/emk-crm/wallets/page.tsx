'use client';
import { useEffect, useState, useCallback } from 'react';
import { vnd } from '@/lib/format';

interface WalletRow {
    userId: string;
    userName: string;
    userPhone: string;
    balance: number;
    txCount: number;
    lastActivity: string | null;
}

export default function AdminWalletsPage() {
    const [wallets, setWallets] = useState<WalletRow[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/emk-crm/wallets')
            .then(r => r.json())
            .then(d => { setWallets(d.wallets || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    const fmtMoney = vnd;

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '56px', borderRadius: '12px', background: 'var(--bg-card)', animation: 'awp 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes awp { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> Quản lý Ví</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Số dư theo tài khoản người dùng
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {wallets.length === 0 ? (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có ví nào</div>
                ) : wallets.map(w => (
                    <div key={w.userId} style={{
                        padding: '12px 14px', borderRadius: '12px', background: 'var(--bg-card)',
                        border: '1px solid var(--border)', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                    }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{w.userName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                📱 {w.userPhone} · {w.txCount} giao dịch
                            </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, fontSize: '16px', color: '#6366f1' }}>{fmtMoney(w.balance)}</div>
                            {w.lastActivity && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    {new Date(w.lastActivity).toLocaleDateString('vi-VN')}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
