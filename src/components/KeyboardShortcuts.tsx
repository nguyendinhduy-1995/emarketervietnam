'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ShortcutDef { key: string; meta?: boolean; shift?: boolean; label: string; action: () => void; section: string; }

export default function KeyboardShortcuts() {
    const router = useRouter();
    const pathname = usePathname();
    const [showHelp, setShowHelp] = useState(false);

    const isCRM = pathname?.startsWith('/emk-crm');
    const isHub = pathname?.startsWith('/hub');

    const shortcuts: ShortcutDef[] = [
        // Global
        {
            key: 'k', meta: true, label: 'Tìm kiếm', action: () => {
                const searchBtn = document.querySelector<HTMLButtonElement>('[aria-label="Tìm kiếm"]');
                searchBtn?.click();
            }, section: 'Chung'
        },
        { key: '?', shift: true, label: 'Phím tắt', action: () => setShowHelp(p => !p), section: 'Chung' },

        // Hub navigation
        { key: 'h', label: 'Hub tổng quan', action: () => router.push('/hub'), section: 'Hub' },
        { key: 'w', label: 'Không gian', action: () => router.push('/hub/workspaces'), section: 'Hub' },
        { key: 'a', label: 'Tài khoản', action: () => router.push('/hub/account'), section: 'Hub' },

        // CRM navigation
        { key: 'd', label: 'Dashboard CRM', action: () => router.push('/emk-crm'), section: 'CRM' },
        { key: 'l', label: 'Tài khoản Hub', action: () => router.push('/emk-crm/accounts'), section: 'CRM' },
        { key: 't', label: 'Công việc', action: () => router.push('/emk-crm/tasks'), section: 'CRM' },
    ];

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        // Don't trigger when typing in inputs
        const tag = (e.target as HTMLElement)?.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

        for (const s of shortcuts) {
            const metaMatch = s.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey);
            const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey || s.key === '?';
            if (e.key.toLowerCase() === s.key.toLowerCase() && metaMatch && (s.shift ? e.shiftKey : true)) {
                e.preventDefault();
                s.action();
                return;
            }
        }

        // Escape closes help
        if (e.key === 'Escape' && showHelp) setShowHelp(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname, showHelp]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!showHelp) return null;

    // Group shortcuts by section
    const sections = shortcuts.reduce<Record<string, ShortcutDef[]>>((acc, s) => {
        (acc[s.section] = acc[s.section] || []).push(s);
        return acc;
    }, {});

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowHelp(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-main)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '400px', maxHeight: '70vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>⌨️ Phím tắt</h3>
                    <button onClick={() => setShowHelp(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
                </div>
                {Object.entries(sections).map(([section, items]) => (
                    <div key={section} style={{ marginBottom: '14px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{section}</div>
                        {items.map(s => (
                            <div key={s.key + s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                                <span style={{ fontSize: '13px' }}>{s.label}</span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                    {s.meta && <kbd style={kbdStyle}>⌘</kbd>}
                                    {s.shift && <kbd style={kbdStyle}>⇧</kbd>}
                                    <kbd style={kbdStyle}>{s.key.toUpperCase()}</kbd>
                                </div>
                            </div>
                        ))}
                    </div>
                ))}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                    Nhấn <kbd style={kbdStyle}>?</kbd> để ẩn/hiện
                </div>
            </div>
        </div>
    );
}

const kbdStyle: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: '22px', height: '22px', padding: '0 6px',
    borderRadius: '6px', fontSize: '11px', fontWeight: 700,
    background: 'var(--bg-card)', border: '1px solid var(--border)',
    color: 'var(--text-muted)', fontFamily: 'inherit',
};
