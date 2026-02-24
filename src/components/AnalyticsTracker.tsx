'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

interface AnalyticsProps {
    layer: 'landing' | 'hub';
}

function generateSessionId(): string {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('_emk_sid') : null;
    if (stored) return stored;
    const sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    if (typeof window !== 'undefined') sessionStorage.setItem('_emk_sid', sid);
    return sid;
}

function getUtmParams(): Record<string, string> {
    if (typeof window === 'undefined') return {};
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(key => {
        const val = params.get(key);
        if (val) utm[key] = val;
    });
    // Also capture ref code (affiliate)
    const ref = params.get('ref');
    if (ref) utm.ref = ref;
    return utm;
}

function track(event: string, properties: Record<string, unknown> = {}) {
    const sessionId = generateSessionId();
    const payload = {
        event,
        properties: {
            ...properties,
            sessionId,
            url: window.location.pathname,
            title: document.title,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            ...getUtmParams(),
        },
    };

    // Use sendBeacon for reliability (won't be cancelled on page unload)
    if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/track', JSON.stringify(payload));
    } else {
        fetch('/api/analytics/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true,
        }).catch(() => { });
    }
}

export default function AnalyticsTracker({ layer }: AnalyticsProps) {
    const pathname = usePathname();
    const prevPathRef = useRef<string>('');
    const startTimeRef = useRef<number>(Date.now());
    const [enabled, setEnabled] = useState<boolean | null>(null);

    // Check if analytics is enabled for this layer
    useEffect(() => {
        const key = layer === 'landing' ? 'analytics_landing' : 'analytics_hub';
        fetch(`/api/ai/settings?keys=${key}`)
            .then(r => r.json())
            .then(d => setEnabled(d[key] !== false))
            .catch(() => setEnabled(true));
    }, [layer]);

    // Track page views on route change
    useEffect(() => {
        if (!enabled) return; // Skip if disabled
        if (pathname === prevPathRef.current) return;

        // Track time spent on previous page
        if (prevPathRef.current) {
            const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
            track('page_exit', {
                layer,
                page: prevPathRef.current,
                timeSpentSeconds: timeSpent,
            });
        }

        prevPathRef.current = pathname;
        startTimeRef.current = Date.now();

        track('page_view', { layer, page: pathname });
    }, [pathname, layer, enabled]);

    // Track engagement events
    useEffect(() => {
        if (!enabled) return; // Skip if disabled
        // Scroll depth tracking
        let maxScroll = 0;
        const handleScroll = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100
            );
            if (scrollPercent > maxScroll && [25, 50, 75, 100].includes(scrollPercent)) {
                maxScroll = scrollPercent;
                track('scroll_depth', { layer, page: pathname, depth: scrollPercent });
            }
        };

        // Track outbound clicks
        const handleClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const link = target.closest('a');
            if (link) {
                const href = link.getAttribute('href') || '';
                // Track CTA button clicks
                if (link.classList.contains('btn') || link.classList.contains('btn-primary')) {
                    track('cta_click', { layer, page: pathname, text: link.textContent?.trim(), href });
                }
                // Track navigation
                if (href.startsWith('/')) {
                    track('nav_click', { layer, page: pathname, href });
                }
            }
            // Track form submissions
            const button = target.closest('button');
            if (button?.type === 'submit') {
                track('form_submit', { layer, page: pathname, formId: button.form?.id });
            }
        };

        // Track page visibility
        const handleVisibility = () => {
            if (document.hidden) {
                const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
                track('page_hidden', { layer, page: pathname, timeSpentSeconds: timeSpent });
            } else {
                track('page_visible', { layer, page: pathname });
                startTimeRef.current = Date.now();
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        document.addEventListener('click', handleClick);
        document.addEventListener('visibilitychange', handleVisibility);

        return () => {
            window.removeEventListener('scroll', handleScroll);
            document.removeEventListener('click', handleClick);
            document.removeEventListener('visibilitychange', handleVisibility);
        };
    }, [pathname, layer, enabled]);

    return null; // Invisible component
}

// Export track function for manual tracking
export { track };
