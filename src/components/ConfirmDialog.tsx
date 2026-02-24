'use client';
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType>({ confirm: async () => false });
export const useConfirm = () => useContext(ConfirmContext);

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise(resolve => setState({ ...options, resolve }));
    }, []);

    const handleClose = (result: boolean) => {
        state?.resolve(result);
        setState(null);
    };

    const variantColors = { danger: '#ef4444', warning: '#f59e0b', default: 'var(--accent-primary)' };
    const color = state ? variantColors[state.variant || 'default'] : 'var(--accent-primary)';

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            {state && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => handleClose(false)}>
                    <div onClick={e => e.stopPropagation()} style={{
                        background: 'var(--bg-main)', borderRadius: '16px', padding: '24px',
                        width: '100%', maxWidth: '380px', animation: 'fadeIn 150ms ease',
                    }}>
                        {state.title && (
                            <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 800, color }}>{state.title}</h3>
                        )}
                        <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                            {state.message}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button onClick={() => handleClose(false)} style={{
                                padding: '8px 18px', borderRadius: '10px', border: '1px solid var(--border)',
                                background: 'var(--bg-card)', cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)',
                            }}>{state.cancelLabel || 'Huỷ'}</button>
                            <button onClick={() => handleClose(true)} style={{
                                padding: '8px 18px', borderRadius: '10px', border: 'none',
                                background: color, cursor: 'pointer', fontFamily: 'inherit',
                                fontSize: '13px', fontWeight: 700, color: 'white',
                            }}>{state.confirmLabel || 'Xác nhận'}</button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}
