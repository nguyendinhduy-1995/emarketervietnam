'use client';

import React from 'react';

export interface FilterOption {
    label: string;
    value: string;
    icon?: string;
    count?: number;
}

interface FilterBarProps {
    options: FilterOption[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export default function FilterBar({ options, value, onChange, className }: FilterBarProps) {
    return (
        <div className={`admin-filter-bar ${className || ''}`}>
            {options.map((opt) => (
                <button
                    key={opt.value}
                    className={`admin-filter-bar__chip ${value === opt.value ? 'admin-filter-bar__chip--active' : ''}`}
                    onClick={() => onChange(opt.value)}
                >
                    {opt.icon && <span>{opt.icon}</span>}
                    <span>{opt.label}</span>
                    {opt.count !== undefined && (
                        <span className="admin-filter-bar__count">{opt.count}</span>
                    )}
                </button>
            ))}
        </div>
    );
}
