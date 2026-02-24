'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult { type: 'page' | 'account' | 'task'; label: string; sub?: string; href: string; icon: string; }

const PAGES: SearchResult[] = [
    { type: 'page', label: 'Hub Tổng quan', href: '/hub', icon: '🏠' },
    { type: 'page', label: 'Không gian', href: '/hub/workspaces', icon: '📦' },
    { type: 'page', label: 'Tài khoản', href: '/hub/account', icon: '👤' },
    { type: 'page', label: 'Sản phẩm', href: '/hub/marketplace', icon: '🛒' },
    { type: 'page', label: 'Cài đặt', href: '/hub/settings', icon: '⚙️' },
    { type: 'page', label: 'Thông báo', href: '/hub/notifications', icon: '🔔' },
    { type: 'page', label: 'CRM Dashboard', href: '/emk-crm', icon: '📊' },
    { type: 'page', label: 'Tài khoản Hub', href: '/emk-crm/accounts', icon: '🏢' },
    { type: 'page', label: 'Công việc', href: '/emk-crm/tasks', icon: '✅' },
    { type: 'page', label: 'Tài khoản', href: '/emk-crm/accounts', icon: '🏢' },
    { type: 'page', label: 'Email Templates', href: '/emk-crm/templates', icon: '📧' },
    { type: 'page', label: 'Nội dung CMS', href: '/emk-crm/cms', icon: '📝' },
    { type: 'page', label: 'Phân tích', href: '/emk-crm/analytics', icon: '📈' },
    { type: 'page', label: 'Báo cáo', href: '/emk-crm/reports', icon: '📄' },
    { type: 'page', label: 'Ví tiền', href: '/hub/wallet', icon: '💰' },
];

export default function QuickSearch() {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIdx, setActiveIdx] = useState(0);
    const [dynamicResults, setDynamicResults] = useState<SearchResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    // Listen for Cmd+K
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(p => !p);
                setQuery('');
                setActiveIdx(0);
            }
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 50); }, [open]);

    // Search accounts when query changes
    const searchDynamic = useCallback(async (q: string) => {
        if (q.length < 2) { setDynamicResults([]); return; }
        try {
            const res = await fetch(`/api/emk-crm/accounts?search=${encodeURIComponent(q)}`);
            const data = await res.json();
            const accounts: SearchResult[] = (data.accounts || []).slice(0, 5).map((a: { id: string; name: string; phone?: string; email?: string }) => ({
                type: 'account' as const, label: a.name, sub: a.phone || a.email || '', href: `/emk-crm/accounts`, icon: '👤',
            }));
            setDynamicResults(accounts);
        } catch { setDynamicResults([]); }
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => searchDynamic(query), 300);
        return () => clearTimeout(timer);
    }, [query, searchDynamic]);

    const q = query.toLowerCase();
    const pageResults = PAGES.filter(p => p.label.toLowerCase().includes(q));
    const results = [...pageResults, ...dynamicResults];

    const handleSelect = (r: SearchResult) => {
        setOpen(false);
        router.push(r.href);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(results.length - 1, i + 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
        if (e.key === 'Enter' && results[activeIdx]) { e.preventDefault(); handleSelect(results[activeIdx]); }
    };

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh' }} onClick={() => setOpen(false)}>
            <div onClick={e => e.stopPropagation()} style={{
                background: 'var(--bg-main)', borderRadius: '16px', width: '100%', maxWidth: '500px',
                overflow: 'hidden', border: '1px solid var(--border)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
                {/* Search input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setActiveIdx(0); }} onKeyDown={handleKeyDown}
                        placeholder="Tìm trang, tài khoản, công việc..."
                        style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: '15px', fontFamily: 'inherit', color: 'var(--text-primary)' }}
                    />
                    <kbd style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>ESC</kbd>
                </div>
                {/* Results */}
                <div style={{ maxHeight: '50vh', overflow: 'auto' }}>
                    {results.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                            {query ? 'Không tìm thấy kết quả' : 'Nhập để tìm kiếm...'}
                        </div>
                    ) : results.map((r, i) => (
                        <button key={r.href + r.label} onClick={() => handleSelect(r)} style={{
                            display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                            padding: '10px 16px', border: 'none', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
                            background: i === activeIdx ? 'var(--accent-primary)10' : 'transparent',
                            color: 'var(--text-primary)', transition: 'background 100ms ease',
                        }} onMouseEnter={() => setActiveIdx(i)}>
                            <span style={{ fontSize: '16px', width: '24px', textAlign: 'center' }}>{r.icon}</span>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.label}</div>
                                {r.sub && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{r.sub}</div>}
                            </div>
                            <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                                {r.type === 'page' ? 'Trang' : r.type === 'account' ? 'TK' : 'Task'}
                            </span>
                        </button>
                    ))}
                </div>
                {/* Footer */}
                <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    <span>↑↓ di chuyển</span>
                    <span>⏎ chọn</span>
                    <span>ESC đóng</span>
                </div>
            </div>
        </div>
    );
}
