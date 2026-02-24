'use client';

/**
 * usePullToRefresh — touch-based pull-to-refresh for mobile
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface PullToRefreshOptions {
    onRefresh: () => Promise<void>;
    threshold?: number; // pixels to pull before triggering (default 80)
}

export function usePullToRefresh({ onRefresh, threshold = 80 }: PullToRefreshOptions) {
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef(0);
    const pulling = useRef(false);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await onRefresh();
        } finally {
            setRefreshing(false);
        }
    }, [onRefresh]);

    useEffect(() => {
        // Only on mobile
        if (window.innerWidth > 767) return;

        const onTouchStart = (e: TouchEvent) => {
            if (window.scrollY === 0) {
                startY.current = e.touches[0].clientY;
                pulling.current = true;
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!pulling.current) return;
            const diff = e.touches[0].clientY - startY.current;
            if (diff > threshold && !refreshing) {
                pulling.current = false;
                handleRefresh();
            }
        };

        const onTouchEnd = () => {
            pulling.current = false;
        };

        document.addEventListener('touchstart', onTouchStart, { passive: true });
        document.addEventListener('touchmove', onTouchMove, { passive: true });
        document.addEventListener('touchend', onTouchEnd, { passive: true });

        return () => {
            document.removeEventListener('touchstart', onTouchStart);
            document.removeEventListener('touchmove', onTouchMove);
            document.removeEventListener('touchend', onTouchEnd);
        };
    }, [threshold, refreshing, handleRefresh]);

    return { refreshing };
}
