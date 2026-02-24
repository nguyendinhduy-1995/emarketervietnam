'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NotificationCenter from './NotificationCenter';

interface SearchResult {
    type: 'product' | 'order' | 'customer' | 'partner';
    label: string;
    href: string;
    icon: string;
    sub?: string;
}

export default function AdminHeader() {
    const [searchOpen, setSearchOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResult[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        if (searchOpen && inputRef.current) inputRef.current.focus();
    }, [searchOpen]);

    // Simple client-side search (can be upgraded to API)
    useEffect(() => {
        if (!query.trim()) { setResults([]); return; }
        const q = query.toLowerCase();
        // Quick navigation shortcuts based on query
        const shortcuts: SearchResult[] = [
            { type: 'product', label: `Tìm sản phẩm "${query}"`, href: `/admin/products?q=${encodeURIComponent(query)}`, icon: '📦' },
            { type: 'order', label: `Tìm đơn hàng "${query}"`, href: `/admin/orders?q=${encodeURIComponent(query)}`, icon: '🛒' },
            { type: 'customer', label: `Tìm khách hàng "${query}"`, href: `/admin/customers?q=${encodeURIComponent(query)}`, icon: '👥' },
            { type: 'partner', label: `Tìm đối tác "${query}"`, href: `/admin/partners?q=${encodeURIComponent(query)}`, icon: '🤝' },
        ];
        setResults(shortcuts);
    }, [query]);

    const handleSelect = (result: SearchResult) => {
        router.push(result.href);
        setSearchOpen(false);
        setQuery('');
    };

    return (
        <header className="admin-header">
            <div className="admin-header__inner">
                <span className="admin-header__brand">SMK</span>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', flex: 1 }}>
                    <button
                        className="admin-header__search-trigger"
                        onClick={() => setSearchOpen(true)}
                        style={{ flex: 1 }}
                    >
                        <span>🔍</span>
                        <span className="admin-header__search-placeholder">Tìm kiếm...</span>
                    </button>
                    <NotificationCenter />
                </div>
            </div>

            {/* Search modal */}
            {searchOpen && (
                <>
                    <div className="admin-header__search-overlay" onClick={() => setSearchOpen(false)} />
                    <div className="admin-header__search-modal">
                        <div className="admin-header__search-input-wrap">
                            <span>🔍</span>
                            <input
                                ref={inputRef}
                                className="admin-header__search-input"
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Tìm sản phẩm, đơn hàng, khách hàng..."
                                onKeyDown={e => {
                                    if (e.key === 'Escape') setSearchOpen(false);
                                    if (e.key === 'Enter' && results.length > 0) handleSelect(results[0]);
                                }}
                            />
                            <button className="admin-header__search-close" onClick={() => setSearchOpen(false)}>✕</button>
                        </div>
                        {results.length > 0 && (
                            <div className="admin-header__search-results">
                                {results.map((r, i) => (
                                    <button
                                        key={i}
                                        className="admin-header__search-result"
                                        onClick={() => handleSelect(r)}
                                    >
                                        <span>{r.icon}</span>
                                        <span>{r.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </header>
    );
}
