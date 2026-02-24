'use client';

import React, { useEffect, useRef } from 'react';

interface AdminDrawerProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    width?: string;
    position?: 'right' | 'bottom';
}

export default function AdminDrawer({ open, onClose, title, children, width = '420px', position = 'bottom' }: AdminDrawerProps) {
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on Escape
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && open) onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    return (
        <>
            {/* Overlay */}
            <div
                className={`admin-drawer-overlay ${open ? 'admin-drawer-overlay--visible' : ''}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`admin-drawer admin-drawer--${position} ${open ? 'admin-drawer--open' : ''}`}
                style={position === 'right' ? { width } : undefined}
            >
                {/* Handle bar for bottom drawer */}
                {position === 'bottom' && (
                    <div className="admin-drawer__handle">
                        <div className="admin-drawer__handle-bar" />
                    </div>
                )}

                {/* Header */}
                {title && (
                    <div className="admin-drawer__header">
                        <h2 className="admin-drawer__title">{title}</h2>
                        <button className="admin-drawer__close" onClick={onClose} aria-label="Close">×</button>
                    </div>
                )}

                {/* Content */}
                <div className="admin-drawer__content">
                    {children}
                </div>
            </div>
        </>
    );
}
