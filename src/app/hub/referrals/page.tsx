'use client';
import { useEffect, useState, useCallback } from 'react';

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

export default function ReferralRewardsPage() {
    const [data, setData] = useState<RewardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadData = useCallback(() => {
        setLoading(true);
        fetch('/api/hub/referral-rewards')
            .then(r => r.json())
            .then(d => { if (!d.error) setData(d); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);


    if (loading) return <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}><div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>⏳ Đang tải...</div></div>;

    if (!data) return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>🎁 Chương trình giới thiệu</h1>
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔗</div>
                <div style={{ fontWeight: 600 }}>Chưa có tài khoản affiliate</div>
                <div style={{ fontSize: '13px', marginTop: '4px' }}>Liên hệ admin để kích hoạt chương trình giới thiệu</div>
            </div>
        </div>
    );

    return (
        <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>🎁 Chương trình giới thiệu</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '20px' }}>Giới thiệu bạn bè & nhận thưởng</p>

            {/* Current Tier */}
            <div style={{ padding: '20px', borderRadius: '16px', background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(99,102,241,0.08))', border: '1px solid rgba(245,158,11,0.15)', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                        <span style={{ fontSize: '22px', fontWeight: 800 }}>{data.currentTier.label}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', marginLeft: '8px' }}>Hoa hồng {data.currentTier.commissionRate}%</span>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e' }}>+{vnd(data.currentTier.creditPerReferral)}/lượt</span>
                </div>
                {data.nextTier && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                            <span>{data.progress.current} lượt giới thiệu</span>
                            <span>{data.nextTier.label} ({data.nextTier.minReferrals})</span>
                        </div>
                        <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(245,158,11,0.15)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(data.progress.pct, 100)}%`, borderRadius: '3px', background: 'linear-gradient(90deg, #f59e0b, #ef4444)', transition: 'width 0.5s' }} />
                        </div>
                    </>
                )}
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                {[
                    { label: 'Tổng giới thiệu', value: data.stats.totalReferrals, color: '#6366f1' },
                    { label: 'Đã chuyển đổi', value: data.stats.paidReferrals, color: '#22c55e' },
                    { label: 'Hoa hồng', value: vnd(data.stats.totalCommission), color: '#f59e0b' },
                    { label: 'Ví', value: vnd(data.stats.walletBalance), color: '#a855f7' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '14px', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Tier Roadmap */}
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>🏅 Cấp bậc</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '16px' }}>
                {data.tiers.map(t => (
                    <div key={t.key} style={{ padding: '12px', borderRadius: '12px', background: t.key === data.currentTier.key ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(99,102,241,0.1))' : 'var(--bg-card)', border: `1px solid ${t.key === data.currentTier.key ? 'rgba(245,158,11,0.3)' : 'var(--border)'}`, textAlign: 'center', opacity: data.stats.totalReferrals >= t.minReferrals ? 1 : 0.5 }}>
                        <div style={{ fontSize: '18px', marginBottom: '4px' }}>{t.label.split(' ')[0]}</div>
                        <div style={{ fontSize: '11px', fontWeight: 600 }}>{t.label.split(' ').slice(1).join(' ')}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>≥{t.minReferrals} lượt • {t.commissionRate}%</div>
                        <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 600, marginTop: '2px' }}>+{vnd(t.creditPerReferral)}</div>
                    </div>
                ))}
            </div>

            {/* Recent Referrals */}
            <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px' }}>📋 Giới thiệu gần đây ({data.recentReferrals.length})</h2>
            {data.recentReferrals.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {data.recentReferrals.map(r => (
                        <div key={r.id} style={{ padding: '8px 12px', borderRadius: '8px', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                            <span style={{ fontWeight: 500 }}>{r.id.slice(0, 8)}...</span>
                            <span style={{ padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, background: `${STATUS_COLOR[r.status] || '#888'}20`, color: STATUS_COLOR[r.status] || '#888' }}>{r.status}</span>
                            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{new Date(r.createdAt).toLocaleDateString('vi')}</span>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)', fontSize: '13px' }}>Chưa có giới thiệu nào</div>
            )}
        </div>
    );
}
