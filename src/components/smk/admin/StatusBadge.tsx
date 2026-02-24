'use client';

import React from 'react';

export interface StatusBadgeProps {
    label: string;
    color?: string;
    variant?: 'solid' | 'outline' | 'subtle';
    size?: 'sm' | 'md';
    icon?: string;
}

const PRESET_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    success: { bg: 'rgba(52,211,153,0.15)', text: 'var(--success)', border: 'rgba(52,211,153,0.3)' },
    warning: { bg: 'rgba(251,191,36,0.15)', text: 'var(--warning)', border: 'rgba(251,191,36,0.3)' },
    error: { bg: 'rgba(248,113,113,0.15)', text: 'var(--error)', border: 'rgba(248,113,113,0.3)' },
    info: { bg: 'rgba(96,165,250,0.15)', text: 'var(--info)', border: 'rgba(96,165,250,0.3)' },
    gold: { bg: 'rgba(212,168,83,0.15)', text: 'var(--gold-400)', border: 'rgba(212,168,83,0.3)' },
    neutral: { bg: 'var(--bg-tertiary)', text: 'var(--text-secondary)', border: 'var(--border-primary)' },
};

export default function StatusBadge({ label, color = 'neutral', variant = 'subtle', size = 'sm', icon }: StatusBadgeProps) {
    const preset = PRESET_COLORS[color] || { bg: color, text: '#fff', border: color };

    const styles: React.CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: size === 'sm' ? '2px 8px' : '4px 12px',
        borderRadius: 'var(--radius-full)',
        fontSize: size === 'sm' ? 11 : 12,
        fontWeight: 600,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        letterSpacing: '0.02em',
        ...(variant === 'solid' && {
            background: preset.text,
            color: '#0a0a0f',
        }),
        ...(variant === 'outline' && {
            background: 'transparent',
            color: preset.text,
            border: `1px solid ${preset.border}`,
        }),
        ...(variant === 'subtle' && {
            background: preset.bg,
            color: preset.text,
        }),
    };

    return <span style={styles}>{icon && <span>{icon}</span>}{label}</span>;
}
