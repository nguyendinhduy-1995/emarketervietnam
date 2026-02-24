'use client';

import React from 'react';

interface StickyActionBarProps {
    children: React.ReactNode;
    visible?: boolean;
}

export default function StickyActionBar({ children, visible = true }: StickyActionBarProps) {
    if (!visible) return null;
    return (
        <div className="admin-sticky-bar">
            <div className="admin-sticky-bar__inner">
                {children}
            </div>
        </div>
    );
}
