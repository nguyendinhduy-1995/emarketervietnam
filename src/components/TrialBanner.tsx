'use client';
import { useState } from 'react';

interface TrialBannerProps {
    daysLeft: number;
    totalDays?: number;
    onUpgrade: () => void;
}

export default function TrialBanner({ daysLeft, totalDays = 14, onUpgrade }: TrialBannerProps) {
    const [dismissed, setDismissed] = useState(false);

    if (dismissed) return null;

    const percent = Math.max(0, Math.min(100, ((totalDays - daysLeft) / totalDays) * 100));
    const isUrgent = daysLeft <= 3;
    const isExpired = daysLeft <= 0;

    return (
        <div style={{
            padding: '14px 16px', borderRadius: '16px', marginBottom: '16px',
            background: isExpired
                ? 'rgba(239,68,68,0.08)'
                : isUrgent
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(99,102,241,0.08)',
            border: `1px solid ${isExpired
                ? 'rgba(239,68,68,0.2)'
                : isUrgent
                    ? 'rgba(245,158,11,0.2)'
                    : 'rgba(99,102,241,0.15)'}`,
            display: 'flex', flexDirection: 'column', gap: '10px',
            animation: 'fadeIn 300ms ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '18px' }}>{isExpired ? '🔴' : isUrgent ? '🟡' : '💎'}</span>
                    <span style={{ fontWeight: 700, fontSize: '14px' }}>
                        {isExpired
                            ? 'Dùng thử đã hết hạn'
                            : `Còn ${daysLeft} ngày dùng thử`}
                    </span>
                </div>
                {!isExpired && (
                    <button
                        onClick={() => setDismissed(true)}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: '16px', color: 'var(--text-muted)', padding: '4px',
                        }}
                        aria-label="Ẩn"
                    >
                        ✕
                    </button>
                )}
            </div>

            {/* Progress bar */}
            <div style={{ height: '4px', borderRadius: '2px', background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: '2px',
                    background: isExpired ? 'var(--danger)' : isUrgent ? 'var(--warning)' : 'var(--accent-gradient)',
                    width: `${percent}%`,
                    transition: 'width 600ms ease',
                }} />
            </div>

            {/* CTA */}
            <button
                onClick={onUpgrade}
                style={{
                    width: '100%', padding: '10px', borderRadius: '12px',
                    background: 'var(--accent-gradient)', border: 'none',
                    color: 'white', fontWeight: 700, fontSize: '14px',
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: 'var(--shadow-glow)',
                    transition: 'transform 150ms ease',
                }}
            >
                ⬆ Nâng cấp ngay
            </button>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
