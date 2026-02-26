'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Suggestion {
    key: string;
    name: string;
    desc: string;
    icon: string;
    price: string;
    reason: string;
}

export default function SolutionSuggestion() {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        fetch('/api/hub/suggestions')
            .then(r => r.json())
            .then(d => setSuggestions(d.suggestions || []))
            .catch(() => { });
    }, []);

    if (dismissed || suggestions.length === 0) return null;

    return (
        <div style={{
            padding: '16px', borderRadius: '16px', marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))',
            border: '1px solid rgba(99,102,241,0.15)',
            animation: 'fadeIn 300ms ease',
        }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px' }}>🤖</span>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--accent-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        AI gợi ý cho bạn
                    </span>
                </div>
                <button onClick={() => setDismissed(true)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '14px', color: 'var(--text-muted)', padding: '2px',
                }} aria-label="Ẩn">✕</button>
            </div>

            {suggestions.map(s => (
                <Link key={s.key} href="/hub/marketplace" style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px', borderRadius: '12px', marginBottom: '6px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    textDecoration: 'none', color: 'var(--text-primary)',
                    transition: 'transform 150ms ease',
                }}>
                    <span style={{ fontSize: '24px', width: '36px', textAlign: 'center' }}>{s.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.reason}</div>
                    </div>
                    <div style={{
                        fontSize: '11px', fontWeight: 700, color: 'var(--accent-primary)',
                        whiteSpace: 'nowrap',
                    }}>
                        {s.price}
                    </div>
                </Link>
            ))}

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '6px' }}>
                Dựa trên hành vi sử dụng của bạn · <Link href="/hub/marketplace" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600 }}>Xem tất cả →</Link>
            </div>

            <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
        </div>
    );
}
