'use client';
import { useEffect, useState } from 'react';

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    items: Array<{ type: string; text: string }>;
}

const TYPE_ICONS: Record<string, string> = {
    feature: '✨',
    fix: '🐛',
    improve: '⚡',
};

export default function ChangelogPage() {
    const [entries, setEntries] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/hub/changelog')
            .then(r => r.json())
            .then(d => { setEntries(d.changelog || []); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '4px' }}>Có gì mới?</h1>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Cập nhật và cải tiến gần đây</p>
            </div>

            {loading ? (
                [1, 2, 3].map(i => (
                    <div key={i} className="emk-skeleton" style={{ height: '120px' }} />
                ))
            ) : (
                entries.map((entry, idx) => (
                    <section key={entry.version} style={{
                        padding: '20px', borderRadius: '18px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        boxShadow: idx === 0 ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                        position: 'relative',
                    }}>
                        {idx === 0 && (
                            <span style={{
                                position: 'absolute', top: '-8px', right: '16px',
                                padding: '3px 10px', borderRadius: '20px',
                                background: 'var(--accent-gradient)', color: 'white',
                                fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                            }}>
                                Mới nhất
                            </span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div>
                                <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '2px' }}>{entry.title}</h2>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    v{entry.version} · {new Date(entry.date).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {entry.items.map((item, i) => (
                                <li key={i} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
                                    <span>{TYPE_ICONS[item.type] || '📌'}</span>
                                    <span>{item.text}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))
            )}
        </div>
    );
}
