'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface WalletInfo { balance: number; ledger: Array<{ id: string; type: string; amount: number; direction: string; refType: string; note: string | null; createdAt: string }>; }
interface SubInfo { status: string; plan: string; daysLeft: number; modules?: number; }
interface UserInfo { name: string; phone: string; email?: string; }

interface Tier { key: string; label: string; minReferrals: number; commissionRate: number; creditPerReferral: number }
interface RewardData {
    tiers: Tier[];
    currentTier: Tier;
    nextTier: Tier | null;
    progress: { current: number; target: number; pct: number };
    stats: { totalReferrals: number; paidReferrals: number; totalCommission: number; walletBalance: number };
    recentReferrals: { id: string; status: string; createdAt: string; convertedAt: string | null }[];
}

import { vnd } from '@/lib/format';
const STATUS_COLOR: Record<string, string> = { CLICKED: '#f59e0b', LEAD: '#3b82f6', TRIAL: '#a855f7', PAID: '#22c55e' };

export default function AccountPage() {
    const [wallet, setWallet] = useState<WalletInfo | null>(null);
    const [sub, setSub] = useState<SubInfo | null>(null);
    const [user, setUser] = useState<UserInfo | null>(null);
    const [refData, setRefData] = useState<RewardData | null>(null);
    const [refLoading, setRefLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'referrals' | 'settings'>('overview');

    useEffect(() => {
        fetch('/api/hub/wallet').then(r => r.json()).then(d => setWallet(d)).catch(() => { });
        fetch('/api/hub/subscription').then(r => r.json()).then(d => setSub(d)).catch(() => { });
        fetch('/api/hub/profile').then(r => r.json()).then(d => setUser(d)).catch(() => { });
    }, []);

    const loadRefData = useCallback(() => {
        setRefLoading(true);
        fetch('/api/hub/referral-rewards')
            .then(r => r.json())
            .then(d => { if (!d.error) setRefData(d); setRefLoading(false); })
            .catch(() => setRefLoading(false));
    }, []);

    useEffect(() => { loadRefData(); }, [loadRefData]);

    const tabs = [
        { key: 'overview', label: 'Tổng quan', icon: '👤' },
        { key: 'wallet', label: 'Ví', icon: '💰' },
        { key: 'referrals', label: 'Giới thiệu', icon: '🎁' },
        { key: 'settings', label: 'Cài đặt', icon: '⚙️' },
    ] as const;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>Tài khoản</h1>

            {/* Tab bar — mobile optimized */}
            <div style={{
                display: 'flex', gap: '2px', background: 'var(--bg-card)', borderRadius: '14px',
                padding: '3px', border: '1px solid var(--border)', overflowX: 'auto',
            }}>
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                        flex: 1, padding: '10px 6px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', minWidth: 0,
                        background: activeTab === t.key ? 'var(--accent-primary)' : 'transparent',
                        color: activeTab === t.key ? 'white' : 'var(--text-secondary)',
                        transition: 'all 200ms ease', fontFamily: 'inherit',
                    }}>
                        <span style={{ display: 'block', fontSize: '16px', marginBottom: '2px' }}>{t.icon}</span>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ─── Overview Tab ─── */}
            {activeTab === 'overview' && (
                <>
                    {/* Profile card */}
                    <div style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--accent-primary), #7c3aed)', color: 'white' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: 800, flexShrink: 0 }}>
                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '18px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'Đang tải...'}</div>
                                <div style={{ fontSize: '13px', opacity: 0.85 }}>{user?.phone || ''}</div>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        <div style={{ padding: '14px 8px', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: '#22c55e' }}>{wallet ? vnd(wallet.balance) : '—'}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Số dư ví</div>
                        </div>
                        <div style={{ padding: '14px 8px', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-primary)' }}>{sub ? `${sub.modules || 0}` : '—'}</div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Sản phẩm</div>
                        </div>
                        <div style={{ padding: '14px 8px', borderRadius: '14px', textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: sub?.status === 'TRIAL' ? '#f59e0b' : '#22c55e' }}>
                                {sub?.status === 'TRIAL' ? `${sub.daysLeft} ngày` : { ACTIVE: 'Hoạt động', NONE: 'Chưa kích hoạt', CANCELED: 'Đã huỷ', EXPIRED: 'Hết hạn' }[sub?.status || ''] || sub?.status || '—'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>Trạng thái</div>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <Link href="/hub/wallet" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                            <span style={{ fontSize: '20px' }}>💰</span>
                            <div><div style={{ fontWeight: 700, fontSize: '13px' }}>Nạp tiền</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>QR Banking</div></div>
                        </Link>
                        <Link href="/hub/billing" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)', textDecoration: 'none', color: 'var(--text-primary)' }}>
                            <span style={{ fontSize: '20px' }}>💳</span>
                            <div><div style={{ fontWeight: 700, fontSize: '13px' }}>Sản phẩm</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Module & App</div></div>
                        </Link>
                    </div>
                </>
            )}

            {/* ─── Wallet Tab ─── */}
            {activeTab === 'wallet' && (
                <>
                    <div style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: 'white', textAlign: 'center' }}>
                        <div style={{ fontSize: '12px', opacity: 0.85, fontWeight: 600 }}>Số dư ví</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '4px' }}>{wallet ? vnd(wallet.balance) : '—'}</div>
                    </div>
                    <Link href="/hub/wallet" style={{
                        display: 'block', textAlign: 'center', padding: '14px', borderRadius: '14px',
                        background: 'var(--accent-primary)', color: 'white', fontWeight: 700, fontSize: '15px',
                        textDecoration: 'none',
                    }}>Nạp tiền →</Link>
                    {wallet && wallet.ledger.length > 0 && (
                        <div>
                            <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>Lịch sử giao dịch</h3>
                            {wallet.ledger.slice(0, 10).map(tx => (
                                <div key={tx.id} style={{
                                    display: 'flex', justifyContent: 'space-between', padding: '12px 0',
                                    borderBottom: '1px solid var(--border)', fontSize: '13px',
                                }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{tx.note || (tx.direction === 'CREDIT' ? 'Nạp tiền' : 'Thanh toán')}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(tx.createdAt).toLocaleDateString('vi-VN')}</div>
                                    </div>
                                    <span style={{ fontWeight: 700, color: tx.direction === 'CREDIT' ? '#22c55e' : '#ef4444' }}>
                                        {tx.direction === 'CREDIT' ? '+' : '-'}{vnd(tx.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ─── Referrals Tab ─── */}
            {activeTab === 'referrals' && (
                <>
                    {refLoading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>⏳ Đang tải...</div>
                    ) : !refData ? (
                        <div style={{ textAlign: 'center', padding: '40px' }}>
                            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔗</div>
                            <div style={{ fontWeight: 600 }}>Chưa có tài khoản affiliate</div>
                            <div style={{ fontSize: '13px', marginTop: '4px', color: 'var(--text-muted)' }}>Liên hệ admin để kích hoạt chương trình giới thiệu</div>
                        </div>
                    ) : (
                        <>
                            {/* Current Tier */}
                            <div style={{ padding: '16px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(245,158,11,0.15)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '4px' }}>
                                    <div>
                                        <span style={{ fontSize: '18px', fontWeight: 800 }}>{refData.currentTier.label}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>HH {refData.currentTier.commissionRate}%</span>
                                    </div>
                                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#22c55e' }}>+{vnd(refData.currentTier.creditPerReferral)}/ref</span>
                                </div>
                                {refData.nextTier && (
                                    <>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                            <span>{refData.progress.current} refs</span>
                                            <span>{refData.nextTier.label} ({refData.nextTier.minReferrals})</span>
                                        </div>
                                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(245,158,11,0.15)', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', width: `${Math.min(refData.progress.pct, 100)}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', transition: 'width 0.5s' }} />
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Stats — 2x2 grid for mobile */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                {[
                                    { label: 'Tổng giới thiệu', value: refData.stats.totalReferrals, color: '#6366f1' },
                                    { label: 'Đã chuyển đổi', value: refData.stats.paidReferrals, color: '#22c55e' },
                                    { label: 'Hoa hồng', value: vnd(refData.stats.totalCommission), color: '#f59e0b' },
                                    { label: 'Ví', value: vnd(refData.stats.walletBalance), color: '#a855f7' },
                                ].map(s => (
                                    <div key={s.label} style={{ padding: '14px 8px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '18px', fontWeight: 800, color: s.color }}>{s.value}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Tier Roadmap — 2x2 for mobile */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>🏅 Lộ trình Tier</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                                    {refData.tiers.map(t => (
                                        <div key={t.key} style={{
                                            padding: '10px', borderRadius: '12px', textAlign: 'center',
                                            background: t.key === refData.currentTier.key ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(99,102,241,0.1))' : 'var(--bg-card)',
                                            border: `1px solid ${t.key === refData.currentTier.key ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`,
                                            opacity: refData.stats.totalReferrals >= t.minReferrals ? 1 : 0.5,
                                        }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{t.label}</div>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>≥{t.minReferrals} refs • {t.commissionRate}%</div>
                                            <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600 }}>+{vnd(t.creditPerReferral)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Referrals */}
                            <div>
                                <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>📋 Giới thiệu gần đây ({refData.recentReferrals.length})</h3>
                                {refData.recentReferrals.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        {refData.recentReferrals.map(r => (
                                            <div key={r.id} style={{ padding: '8px 10px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', gap: '6px', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 500, fontFamily: 'monospace', fontSize: '11px' }}>{r.id.slice(0, 8)}...</span>
                                                <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: `${STATUS_COLOR[r.status] || '#888'}20`, color: STATUS_COLOR[r.status] || '#888' }}>{r.status}</span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(r.createdAt).toLocaleDateString('vi')}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có giới thiệu nào</div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* ─── Settings Tab ─── */}
            {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[
                        { label: 'Hồ sơ', desc: 'Tên, SĐT, email', href: '/hub/settings' },
                        { label: 'Bảo mật', desc: 'Đổi mật khẩu', href: '/hub/settings' },
                        { label: 'Trợ giúp', desc: 'Tài liệu hướng dẫn', href: '/hub/help' },
                    ].map(item => (
                        <Link key={item.label} href={item.href} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '16px', borderRadius: '14px', background: 'var(--bg-card)', border: '1px solid var(--border)',
                            textDecoration: 'none', color: 'var(--text-primary)',
                        }}>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
