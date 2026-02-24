'use client';

import React, { useEffect, useState } from 'react';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'warning' | 'info';
    duration?: number;
    onClose: () => void;
}

const TOAST_ICONS: Record<string, string> = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️',
};

const TOAST_COLORS: Record<string, string> = {
    success: 'var(--success)',
    error: 'var(--error)',
    warning: 'var(--warning)',
    info: 'var(--info)',
};

export default function Toast({ message, type = 'success', duration = 3000, onClose }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300); // wait for fade out
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`admin-toast ${visible ? 'admin-toast--visible' : 'admin-toast--hidden'}`}
            style={{ borderLeftColor: TOAST_COLORS[type] }}
        >
            <span className="admin-toast__icon">{TOAST_ICONS[type]}</span>
            <span className="admin-toast__message">{message}</span>
            <button className="admin-toast__close" onClick={() => { setVisible(false); setTimeout(onClose, 300); }}>×</button>
        </div>
    );
}
