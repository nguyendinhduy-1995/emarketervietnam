'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
    type: string;
    title: string;
    subtitle?: string;
    url: string;
    icon: string;
}

const TYPE_LABELS: Record<string, string> = {
    page: 'Trang', article: 'Bài viết', help: 'Trợ giúp', account: 'Tài khoản',
};

export default function SearchModal() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Cmd/Ctrl+K shortcut
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(prev => !prev);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setResults([]);
            setSelectedIdx(0);
        }
    }, [open]);

    // Debounced search
    const doSearch = useCallback((q: string) => {
        if (q.length < 2) { setResults([]); return; }
        setLoading(true);
        fetch(`/api/hub/search?q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => { setResults(d.results || []); setLoading(false); setSelectedIdx(0); })
            .catch(() => setLoading(false));
    }, []);

    const onQueryChange = (val: string) => {
        setQuery(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => doSearch(val), 250);
    };

    // Navigate to result
    const goTo = (url: string) => {
        setOpen(false);
        router.push(url);
    };

    // Keyboard navigation
    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIdx(i => Math.min(i + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIdx(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && results[selectedIdx]) {
            goTo(results[selectedIdx].url);
        }
    };

    if (!open) return null;

    return (
        <div onClick={() => setOpen(false)} style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '80px 16px 16px',
        }}>
            <div onClick={e => e.stopPropagation()} style={{
                width: '100%', maxWidth: '520px', borderRadius: '16px',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
                overflow: 'hidden',
            }}>
                {/* Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input ref={inputRef} value={query} onChange={e => onQueryChange(e.target.value)} onKeyDown={onKeyDown}
                        placeholder="Tìm trang, bài viết, tài khoản..."
                        style={{
                            flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: '15px',
                            fontFamily: 'inherit', color: 'var(--text-primary)', padding: 0,
                        }}
                    />
                    <kbd style={{
                        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                        background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)',
                    }}>ESC</kbd>
                </div>

                {/* Results */}
                <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {loading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Đang tìm kiếm...
                        </div>
                    ) : query.length >= 2 && results.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔍</div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                Không tìm thấy kết quả cho &ldquo;{query}&rdquo;
                            </div>
                        </div>
                    ) : query.length < 2 ? (
                        <div style={{ padding: '16px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                Truy cập nhanh
                            </div>
                            {[
                                { icon: '🏠', title: 'Tổng quan', url: '/hub' },
                                { icon: '🎯', title: 'CRM — Tài khoản', url: '/emk-crm/accounts' },
                                { icon: '📊', title: 'CRM — Dashboard', url: '/emk-crm/dashboard' },
                                { icon: '📚', title: 'Trợ giúp', url: '/hub/help' },
                                { icon: '💰', title: 'Ví', url: '/hub/wallet' },
                            ].map((item, i) => (
                                <button key={i} onClick={() => goTo(item.url)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                    padding: '10px 12px', borderRadius: '10px', border: 'none', textAlign: 'left',
                                    background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
                                    color: 'var(--text-primary)', fontSize: '14px',
                                    transition: 'background 100ms',
                                }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <span style={{ fontSize: '16px' }}>{item.icon}</span>
                                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div style={{ padding: '8px' }}>
                            {results.map((r, i) => (
                                <button key={i} onClick={() => goTo(r.url)} style={{
                                    display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                    padding: '10px 12px', borderRadius: '10px', border: 'none', textAlign: 'left',
                                    background: i === selectedIdx ? 'var(--bg-input)' : 'transparent',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    transition: 'background 100ms',
                                }}
                                    onMouseEnter={() => setSelectedIdx(i)}
                                >
                                    <span style={{ fontSize: '16px', flexShrink: 0 }}>{r.icon}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {r.title}
                                        </div>
                                        {r.subtitle && (
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{r.subtitle}</div>
                                        )}
                                    </div>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                                        background: 'var(--bg-input)', color: 'var(--text-muted)',
                                    }}>
                                        {TYPE_LABELS[r.type] || r.type}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer hint */}
                <div style={{
                    padding: '8px 16px', borderTop: '1px solid var(--border)',
                    display: 'flex', gap: '16px', justifyContent: 'center',
                    fontSize: '11px', color: 'var(--text-muted)',
                }}>
                    <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '10px' }}>↑↓</kbd> di chuyển</span>
                    <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '10px' }}>Enter</kbd> mở</span>
                    <span><kbd style={{ padding: '1px 4px', borderRadius: '3px', border: '1px solid var(--border)', fontSize: '10px' }}>Esc</kbd> đóng</span>
                </div>
            </div>
        </div>
    );
}
