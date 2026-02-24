'use client';

/**
 * SwipeCard — swipe-to-reveal action buttons on mobile
 * Usage:
 * <SwipeCard
 *   actions={[
 *     { icon: '✅', label: 'Duyệt', color: '#22c55e', onClick: () => {} },
 *     { icon: '❌', label: 'Từ chối', color: '#ef4444', onClick: () => {} },
 *   ]}
 * >
 *   <div>Card content</div>
 * </SwipeCard>
 */

import React, { useRef, useState, useCallback } from 'react';

interface SwipeAction {
    icon: string;
    label: string;
    color: string;
    onClick: () => void;
}

interface SwipeCardProps {
    children: React.ReactNode;
    actions: SwipeAction[];
    className?: string;
}

export default function SwipeCard({ children, actions, className = '' }: SwipeCardProps) {
    const startX = useRef(0);
    const currentX = useRef(0);
    const [offset, setOffset] = useState(0);
    const [swiping, setSwiping] = useState(false);
    const maxSwipe = actions.length * 72;

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        startX.current = e.touches[0].clientX;
        currentX.current = offset;
        setSwiping(true);
    }, [offset]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!swiping) return;
        const diff = startX.current - e.touches[0].clientX;
        const newOffset = Math.max(0, Math.min(maxSwipe, currentX.current + diff));
        setOffset(newOffset);
    }, [swiping, maxSwipe]);

    const handleTouchEnd = useCallback(() => {
        setSwiping(false);
        // Snap to open or closed
        setOffset(prev => prev > maxSwipe / 3 ? maxSwipe : 0);
    }, [maxSwipe]);

    const reset = () => setOffset(0);

    return (
        <div className={`zen-swipe-card ${className}`}>
            <div className="zen-swipe-card__actions">
                {actions.map((a, i) => (
                    <button key={i} className="zen-swipe-card__action"
                        onClick={() => { a.onClick(); reset(); }}
                        style={{ background: a.color }}>
                        <div style={{ textAlign: 'center' }}>
                            <div>{a.icon}</div>
                            <div style={{ fontSize: 9, marginTop: 2 }}>{a.label}</div>
                        </div>
                    </button>
                ))}
            </div>
            <div className="zen-swipe-card__content"
                style={{ transform: `translateX(-${offset}px)`, transition: swiping ? 'none' : 'transform 200ms ease' }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}>
                {children}
            </div>
        </div>
    );
}
