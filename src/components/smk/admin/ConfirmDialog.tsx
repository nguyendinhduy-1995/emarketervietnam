'use client';

import React from 'react';
import AdminDrawer from './AdminDrawer';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'info';
    loading?: boolean;
}

export default function ConfirmDialog({
    open, onClose, onConfirm, title, message,
    confirmLabel = 'Xác nhận', cancelLabel = 'Huỷ',
    variant = 'danger', loading = false,
}: ConfirmDialogProps) {
    const variantStyles: Record<string, { bg: string; color: string }> = {
        danger: { bg: 'var(--error)', color: '#fff' },
        warning: { bg: 'var(--warning)', color: '#0a0a0f' },
        info: { bg: 'var(--info)', color: '#fff' },
    };
    const style = variantStyles[variant];

    return (
        <AdminDrawer open={open} onClose={onClose} title={title}>
            <div style={{ padding: 'var(--space-4)' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.6 }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                    <button
                        className="btn"
                        style={{ flex: 1, minHeight: 44 }}
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        className="btn"
                        style={{ flex: 1, minHeight: 44, background: style.bg, color: style.color, border: 'none' }}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? '⏳...' : confirmLabel}
                    </button>
                </div>
            </div>
        </AdminDrawer>
    );
}
