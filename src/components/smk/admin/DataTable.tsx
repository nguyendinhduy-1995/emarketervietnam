'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';

/* ═══ Types ═══ */
export interface DataTableColumn<T> {
    key: string;
    label: string;
    render?: (row: T, index: number) => React.ReactNode;
    sortable?: boolean;
    width?: string;
    hideOnMobile?: boolean; // hide in card mode
    priority?: number; // 1 = always show in card, 2 = show if space, 3 = expandable only
}

export interface RowAction<T> {
    label: string;
    icon?: string;
    onClick: (row: T) => void;
    variant?: 'default' | 'danger';
    hidden?: (row: T) => boolean;
}

export interface DataTableProps<T> {
    columns: DataTableColumn<T>[];
    data: T[];
    loading?: boolean;
    rowKey: (row: T) => string;
    actions?: RowAction<T>[];
    searchable?: boolean;
    searchPlaceholder?: string;
    searchKeys?: string[];
    pagination?: boolean;
    pageSize?: number;
    bulkActions?: { label: string; icon?: string; onClick: (selected: T[]) => void; variant?: 'default' | 'danger' }[];
    emptyIcon?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    onRowClick?: (row: T) => void;
    cardTitle?: (row: T) => React.ReactNode;
    cardSubtitle?: (row: T) => React.ReactNode;
}

/* ═══ Component ═══ */
export default function DataTable<T extends Record<string, unknown>>({
    columns, data, loading, rowKey, actions,
    searchable = true, searchPlaceholder = '🔍 Tìm kiếm...', searchKeys,
    pagination = true, pageSize = 10,
    bulkActions, emptyIcon = '📭', emptyTitle = 'Chưa có dữ liệu',
    emptyDescription, onRowClick, cardTitle, cardSubtitle,
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [page, setPage] = useState(0);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openKebab, setOpenKebab] = useState<string | null>(null);
    const kebabRef = useRef<HTMLDivElement>(null);

    // Close kebab on outside click
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (kebabRef.current && !kebabRef.current.contains(e.target as Node)) setOpenKebab(null);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, []);

    // Search filter
    const filtered = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        const keys = searchKeys || columns.map(c => c.key);
        return data.filter(row =>
            keys.some(k => String((row as Record<string, unknown>)[k] ?? '').toLowerCase().includes(q))
        );
    }, [data, search, searchKeys, columns]);

    // Sort
    const sorted = useMemo(() => {
        if (!sortKey) return filtered;
        return [...filtered].sort((a, b) => {
            const va = String((a as Record<string, unknown>)[sortKey] ?? '');
            const vb = String((b as Record<string, unknown>)[sortKey] ?? '');
            const cmp = va.localeCompare(vb, undefined, { numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        });
    }, [filtered, sortKey, sortDir]);

    // Pagination
    const totalPages = Math.ceil(sorted.length / pageSize);
    const paged = pagination ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

    const handleSort = useCallback((key: string) => {
        if (sortKey === key) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    }, [sortKey]);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === paged.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(paged.map(r => rowKey(r))));
        }
    };

    // Loading skeleton
    if (loading) {
        return (
            <div className="admin-datatable">
                {searchable && <div className="admin-datatable__search-wrap"><input className="admin-datatable__search" disabled placeholder={searchPlaceholder} /></div>}
                <div className="admin-datatable__skeleton">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="admin-datatable__skeleton-row">
                            {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j} className="admin-datatable__skeleton-cell" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Empty state
    if (data.length === 0 && !loading) {
        return (
            <div className="admin-datatable">
                {searchable && <div className="admin-datatable__search-wrap"><input className="admin-datatable__search" value={search} onChange={e => setSearch(e.target.value)} placeholder={searchPlaceholder} /></div>}
                <div className="admin-empty-state">
                    <span className="admin-empty-state__icon">{emptyIcon}</span>
                    <h3 className="admin-empty-state__title">{emptyTitle}</h3>
                    {emptyDescription && <p className="admin-empty-state__desc">{emptyDescription}</p>}
                </div>
            </div>
        );
    }

    const visibleCols = columns.filter(c => !c.hideOnMobile || c.priority === 1);

    return (
        <div className="admin-datatable">
            {/* Search + Bulk actions bar */}
            <div className="admin-datatable__toolbar">
                {searchable && (
                    <div className="admin-datatable__search-wrap">
                        <input
                            className="admin-datatable__search"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(0); }}
                            placeholder={searchPlaceholder}
                        />
                    </div>
                )}
                {bulkActions && selected.size > 0 && (
                    <div className="admin-datatable__bulk-bar">
                        <span className="admin-datatable__bulk-count">{selected.size} đã chọn</span>
                        {bulkActions.map((ba, i) => (
                            <button
                                key={i}
                                className={`admin-datatable__bulk-btn ${ba.variant === 'danger' ? 'admin-datatable__bulk-btn--danger' : ''}`}
                                onClick={() => ba.onClick(paged.filter(r => selected.has(rowKey(r))))}
                            >
                                {ba.icon} {ba.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ═══ CARD VIEW (mobile) ═══ */}
            <div className="admin-datatable__cards">
                {paged.map((row, idx) => {
                    const id = rowKey(row);
                    return (
                        <div
                            key={id}
                            className={`admin-datatable__card ${selected.has(id) ? 'admin-datatable__card--selected' : ''}`}
                            onClick={() => onRowClick?.(row)}
                        >
                            {bulkActions && (
                                <input
                                    type="checkbox"
                                    className="admin-datatable__card-check"
                                    checked={selected.has(id)}
                                    onChange={() => toggleSelect(id)}
                                    onClick={e => e.stopPropagation()}
                                />
                            )}
                            <div className="admin-datatable__card-body">
                                {cardTitle && <div className="admin-datatable__card-title">{cardTitle(row)}</div>}
                                {cardSubtitle && <div className="admin-datatable__card-subtitle">{cardSubtitle(row)}</div>}
                                <div className="admin-datatable__card-fields">
                                    {visibleCols.filter(c => c.key !== 'name' && c.key !== 'title').map(col => (
                                        <div key={col.key} className="admin-datatable__card-field">
                                            <span className="admin-datatable__card-field-label">{col.label}</span>
                                            <span className="admin-datatable__card-field-value">
                                                {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            {actions && actions.length > 0 && (
                                <div className="admin-datatable__card-actions" ref={openKebab === id ? kebabRef : undefined}>
                                    <button
                                        className="admin-datatable__kebab"
                                        onClick={(e) => { e.stopPropagation(); setOpenKebab(openKebab === id ? null : id); }}
                                    >⋯</button>
                                    {openKebab === id && (
                                        <div className="admin-datatable__kebab-menu">
                                            {actions.filter(a => !a.hidden?.(row)).map((a, i) => (
                                                <button
                                                    key={i}
                                                    className={`admin-datatable__kebab-item ${a.variant === 'danger' ? 'admin-datatable__kebab-item--danger' : ''}`}
                                                    onClick={(e) => { e.stopPropagation(); a.onClick(row); setOpenKebab(null); }}
                                                >
                                                    {a.icon} {a.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ═══ TABLE VIEW (desktop) ═══ */}
            <div className="admin-datatable__table-wrap">
                <table className="admin-datatable__table">
                    <thead>
                        <tr>
                            {bulkActions && (
                                <th style={{ width: 40 }}>
                                    <input type="checkbox" checked={selected.size === paged.length && paged.length > 0} onChange={toggleAll} />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    {col.label}
                                    {col.sortable && sortKey === col.key && (
                                        <span className="admin-datatable__sort-icon">{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
                                    )}
                                </th>
                            ))}
                            {actions && <th style={{ width: 50 }}>Thao tác</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((row, idx) => {
                            const id = rowKey(row);
                            return (
                                <tr
                                    key={id}
                                    className={`${selected.has(id) ? 'admin-datatable__row--selected' : ''} ${onRowClick ? 'admin-datatable__row--clickable' : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {bulkActions && (
                                        <td>
                                            <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} onClick={e => e.stopPropagation()} />
                                        </td>
                                    )}
                                    {columns.map(col => (
                                        <td key={col.key}>
                                            {col.render ? col.render(row, idx) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                                        </td>
                                    ))}
                                    {actions && (
                                        <td>
                                            <div className="admin-datatable__card-actions" ref={openKebab === id ? kebabRef : undefined} style={{ position: 'relative' }}>
                                                <button className="admin-datatable__kebab" onClick={(e) => { e.stopPropagation(); setOpenKebab(openKebab === id ? null : id); }}>⋯</button>
                                                {openKebab === id && (
                                                    <div className="admin-datatable__kebab-menu">
                                                        {actions.filter(a => !a.hidden?.(row)).map((a, i) => (
                                                            <button
                                                                key={i}
                                                                className={`admin-datatable__kebab-item ${a.variant === 'danger' ? 'admin-datatable__kebab-item--danger' : ''}`}
                                                                onClick={(e) => { e.stopPropagation(); a.onClick(row); setOpenKebab(null); }}
                                                            >
                                                                {a.icon} {a.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {pagination && totalPages > 1 && (
                <div className="admin-datatable__pagination">
                    <span className="admin-datatable__pagination-info">
                        {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} / {sorted.length}
                    </span>
                    <div className="admin-datatable__pagination-btns">
                        <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="admin-datatable__pagination-btn">←</button>
                        <span className="admin-datatable__pagination-page">{page + 1}/{totalPages}</span>
                        <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="admin-datatable__pagination-btn">→</button>
                    </div>
                </div>
            )}
        </div>
    );
}
