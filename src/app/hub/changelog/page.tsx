'use client';
import { useEffect, useState, useCallback } from 'react';

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    items: Array<{ type: string; text: string }>;
}

export default function ChangelogPage() {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(() => {
        setLoading(true);
        fetch('/api/hub/changelog')
            .then(r => r.json())
            .then(d => { setEntries(d.changelog || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);
    useEffect(load, [load]);

    // Mark latest as "new" if within 7 days
    const isNew = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        return diff < 7 * 24 * 60 * 60 * 1000;
    };

    const typeIcon: Record<string, { icon: string; color: string; label: string }> = {
        feature: { icon: '✨', color: '#6366f1', label: 'Tính năng' },
        fix: { icon: '🐛', color: '#22c55e', label: 'Sửa lỗi' },
        improvement: { icon: '⚡', color: '#f59e0b', label: 'Cải thiện' },
    };

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
                <div key={i} style={{ height: '120px', borderRadius: '14px', background: 'var(--bg-card)', animation: 'clp 1.5s ease-in-out infinite' }} />
            ))}
            <style>{`@keyframes clp { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }`}</style>
        </div>
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
                <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>📋 Nhật ký thay đổi</h1>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
                    Cập nhật tính năng mới và cải thiện
                </p>
            </div>

            {/* Timeline */}
            <div style={{ position: 'relative', paddingLeft: '24px' }}>
                {/* Vertical line */}
                <div style={{
                    position: 'absolute', left: '8px', top: 0, bottom: 0, width: '2px',
                    background: 'var(--border)',
                }} />

                {entries.map((entry, idx) => (
                    <div key={entry.version} style={{ position: 'relative', marginBottom: '24px' }}>
                        {/* Timeline dot */}
                        <div style={{
                            position: 'absolute', left: '-20px', top: '4px',
                            width: '14px', height: '14px', borderRadius: '7px',
                            background: idx === 0 ? '#6366f1' : 'var(--border)',
                            border: '3px solid var(--bg-primary)',
                        }} />

                        {/* Card */}
                        <div style={{
                            padding: '16px 18px', borderRadius: '14px',
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                            ...(idx === 0 ? { borderColor: 'rgba(99,102,241,0.3)', background: 'linear-gradient(135deg, rgba(99,102,241,0.03), transparent)' } : {}),
                        }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                <span style={{
                                    fontSize: '11px', fontWeight: 800, padding: '2px 8px',
                                    borderRadius: '6px', background: 'var(--accent-primary)',
                                    color: 'white', fontFamily: 'monospace',
                                }}>v{entry.version}</span>
                                <span style={{ fontSize: '16px', fontWeight: 700 }}>{entry.title}</span>
                                {isNew(entry.date) && (
                                    <span style={{
                                        fontSize: '10px', fontWeight: 800, padding: '2px 8px',
                                        borderRadius: '6px', background: '#ef4444', color: 'white',
                                        animation: 'nblink 2s ease-in-out infinite',
                                    }}>MỚI</span>
                                )}
                            </div>

                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px' }}>
                                📅 {new Date(entry.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>

                            {/* Items */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {entry.items.map((item, i) => {
                                    const meta = typeIcon[item.type] || typeIcon.feature;
                                    return (
                                        <div key={i} style={{
                                            display: 'flex', alignItems: 'flex-start', gap: '8px',
                                            padding: '6px 10px', borderRadius: '8px',
                                            background: `${meta.color}08`,
                                        }}>
                                            <span style={{ fontSize: '14px', flexShrink: 0 }}>{meta.icon}</span>
                                            <span style={{ fontSize: '13px', lineHeight: 1.5 }}>{item.text}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style>{`@keyframes nblink { 0%,100% { opacity: 1 } 50% { opacity: 0.6 } }`}</style>
        </div>
    );
}
