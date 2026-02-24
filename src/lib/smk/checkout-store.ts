// Checkout auto-fill store using localStorage

const STORAGE_KEY = 'smk_checkout_data';

export interface CheckoutData {
    name: string;
    phone: string;
    email: string;
    address: string;
    note: string;
    paymentMethod: 'COD' | 'BANK' | 'MOMO';
    shippingMethod: 'STANDARD' | 'EXPRESS';
}

const DEFAULT_DATA: CheckoutData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    note: '',
    paymentMethod: 'COD',
    shippingMethod: 'STANDARD',
};

export function loadCheckoutData(): CheckoutData {
    if (typeof window === 'undefined') return DEFAULT_DATA;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_DATA;
        return { ...DEFAULT_DATA, ...JSON.parse(raw) };
    } catch {
        return DEFAULT_DATA;
    }
}

export function saveCheckoutData(data: Partial<CheckoutData>): void {
    if (typeof window === 'undefined') return;
    try {
        const existing = loadCheckoutData();
        const merged = { ...existing, ...data };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch {
        // silently fail
    }
}

export function hasReturnCustomer(): boolean {
    if (typeof window === 'undefined') return false;
    const data = loadCheckoutData();
    return !!(data.name && data.phone && data.address);
}
