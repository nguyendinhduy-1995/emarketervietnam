'use client';
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    type: ToastType;
    message: string;
    exiting?: boolean;
}

interface ToastContextType {
    toast: (message: string, type?: ToastType) => void;
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
    warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

const ICONS: Record<ToastType, string> = {
    success: '✅',
    error: '❌',
    info: 'ℹ️',
    warning: '⚠️',
};

const COLORS: Record<ToastType, { bg: string; border: string }> = {
    success: { bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)' },
    error: { bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)' },
    info: { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const counterRef = useRef(0);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 150);
    }, []);

    const addToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = `toast-${++counterRef.current}`;
        setToasts(prev => {
            const next = [...prev, { id, type, message }];
            return next.slice(-3); // max 3 toasts
        });
        setTimeout(() => removeToast(id), 3000);
    }, [removeToast]);

    const api: ToastContextType = {
        toast: addToast,
        success: useCallback((m: string) => addToast(m, 'success'), [addToast]),
        error: useCallback((m: string) => addToast(m, 'error'), [addToast]),
        info: useCallback((m: string) => addToast(m, 'info'), [addToast]),
        warning: useCallback((m: string) => addToast(m, 'warning'), [addToast]),
    };

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* Toast Container */}
            <div
                style={{
                    position: 'fixed',
                    bottom: '90px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 9999,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    alignItems: 'center',
                    pointerEvents: 'none',
                    width: '90%',
                    maxWidth: '400px',
                }}
            >
                {toasts.map(t => (
                    <ToastItem key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        requestAnimationFrame(() => setMounted(true));
    }, []);

    const c = COLORS[toast.type];

    return (
        <div
            onClick={onDismiss}
            style={{
                pointerEvents: 'auto',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 18px',
                borderRadius: '14px',
                background: c.bg,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: `1px solid ${c.border}`,
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                width: '100%',
                opacity: mounted && !toast.exiting ? 1 : 0,
                transform: mounted && !toast.exiting ? 'translateY(0)' : 'translateY(12px)',
                transition: 'all 150ms ease',
            }}
        >
            <span style={{ fontSize: '18px', flexShrink: 0 }}>{ICONS[toast.type]}</span>
            <span style={{ flex: 1 }}>{toast.message}</span>
        </div>
    );
}
