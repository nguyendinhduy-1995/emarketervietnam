'use client';

import React from 'react';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({ icon = '📭', title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="admin-empty-state">
            <span className="admin-empty-state__icon">{icon}</span>
            <h3 className="admin-empty-state__title">{title}</h3>
            {description && <p className="admin-empty-state__desc">{description}</p>}
            {actionLabel && onAction && (
                <button className="btn btn-primary admin-empty-state__btn" onClick={onAction}>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
