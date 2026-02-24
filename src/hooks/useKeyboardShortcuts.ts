'use client';

/**
 * useKeyboardShortcuts — global keyboard shortcuts for admin
 */

import { useEffect, useState, useCallback } from 'react';

interface Shortcut {
    key: string;
    label: string;
    action: () => void;
    meta?: boolean; // requires Cmd/Ctrl
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const [showHelp, setShowHelp] = useState(false);

    const toggleHelp = useCallback(() => setShowHelp(prev => !prev), []);

    useEffect(() => {
        // Only on desktop
        if (window.innerWidth < 768) return;

        const handler = (e: KeyboardEvent) => {
            // Don't fire when typing in inputs
            const tag = (e.target as HTMLElement).tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;

            if (e.key === '?') {
                e.preventDefault();
                toggleHelp();
                return;
            }

            for (const shortcut of shortcuts) {
                const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
                if (e.key.toLowerCase() === shortcut.key.toLowerCase() && metaMatch) {
                    e.preventDefault();
                    shortcut.action();
                    return;
                }
            }
        };

        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [shortcuts, toggleHelp]);

    return { showHelp, setShowHelp };
}
