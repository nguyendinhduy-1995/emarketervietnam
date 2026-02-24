'use client';

import React from 'react';

export interface StatCardProps {
    label: string;
    value: string | number;
    icon?: string;
    color?: string;
    change?: { value: string; direction: 'up' | 'down' };
    onClick?: () => void;
}

export default function StatCard({ label, value, icon, color, change, onClick }: StatCardProps) {
    return (
        <div
            className="admin-stat-card"
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                borderLeft: color ? `3px solid ${color}` : undefined,
            }}
        >
            <div className="admin-stat-card__header">
                {icon && <span className="admin-stat-card__icon">{icon}</span>}
                <span className="admin-stat-card__label">{label}</span>
            </div>
            <div className="admin-stat-card__value" style={{ color: color || 'var(--text-primary)' }}>
                {value}
            </div>
            {change && (
                <div className={`admin-stat-card__change admin-stat-card__change--${change.direction}`}>
                    {change.direction === 'up' ? '↑' : '↓'} {change.value}
                </div>
            )}
        </div>
    );
}
