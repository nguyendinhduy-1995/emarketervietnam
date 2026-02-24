'use client';

// Analytics event tracking utility
// Fires GA4 events + stores locally for A/B test correlation

type EventName =
    | 'view_item'
    | 'add_to_cart'
    | 'begin_checkout'
    | 'purchase'
    | 'quiz_start'
    | 'quiz_complete'
    | 'try_on_start'
    | 'share_product'
    | 'apply_voucher'
    | 'partner_link_copy'
    | 'partner_kit_download'
    | 'flash_sale_click'
    | 'bundle_select'
    | 'review_helpful';

interface EventParams {
    [key: string]: string | number | boolean | undefined;
}

export function trackEvent(event: EventName, params?: EventParams) {
    // GA4
    if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', event, params);
    }

    // Local storage for debugging / A/B test correlation
    if (typeof window !== 'undefined') {
        try {
            const key = 'smk_events';
            const raw = localStorage.getItem(key);
            const events = raw ? JSON.parse(raw) : [];
            events.push({ event, params, timestamp: Date.now() });
            // Keep last 100 events
            if (events.length > 100) events.splice(0, events.length - 100);
            localStorage.setItem(key, JSON.stringify(events));
        } catch { /* silently fail */ }
    }
}

// Convenience wrappers
export const analytics = {
    viewItem: (slug: string, name: string, price: number) =>
        trackEvent('view_item', { item_id: slug, item_name: name, value: price }),

    addToCart: (slug: string, name: string, price: number, qty: number) =>
        trackEvent('add_to_cart', { item_id: slug, item_name: name, value: price, quantity: qty }),

    beginCheckout: (total: number, itemCount: number) =>
        trackEvent('begin_checkout', { value: total, items: itemCount }),

    purchase: (orderId: string, total: number) =>
        trackEvent('purchase', { transaction_id: orderId, value: total }),

    quizStart: () => trackEvent('quiz_start'),
    quizComplete: (face: string, style: string, budget: string) =>
        trackEvent('quiz_complete', { face_shape: face, style, budget }),

    tryOnStart: () => trackEvent('try_on_start'),
    shareProduct: (slug: string) => trackEvent('share_product', { item_id: slug }),
    applyVoucher: (code: string) => trackEvent('apply_voucher', { coupon: code }),
    flashSaleClick: () => trackEvent('flash_sale_click'),
    bundleSelect: (bundleId: string) => trackEvent('bundle_select', { bundle_id: bundleId }),
    reviewHelpful: (reviewId: string) => trackEvent('review_helpful', { review_id: reviewId }),
    partnerLinkCopy: (code: string) => trackEvent('partner_link_copy', { partner_code: code }),
    partnerKitDownload: (product: string) => trackEvent('partner_kit_download', { product }),
};
