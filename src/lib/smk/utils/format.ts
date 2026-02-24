/**
 * Format utilities for Vietnamese locale
 */

/**
 * Format VND currency
 * e.g. 1500000 → "1.500.000₫"
 */
export function formatVND(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
    }).format(amount);
}

/**
 * Format compact currency
 * e.g. 1500000 → "1.5tr"
 */
export function formatCompactVND(amount: number): string {
    if (amount >= 1_000_000_000) {
        return `${(amount / 1_000_000_000).toFixed(1)}tỷ`;
    }
    if (amount >= 1_000_000) {
        return `${(amount / 1_000_000).toFixed(1)}tr`;
    }
    if (amount >= 1_000) {
        return `${(amount / 1_000).toFixed(0)}k`;
    }
    return `${amount}₫`;
}

/**
 * Format date to Vietnamese locale
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options,
    });
}

/**
 * Format relative time
 * e.g. "2 giờ trước", "5 phút trước"
 */
export function formatRelativeTime(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHr < 24) return `${diffHr} giờ trước`;
    if (diffDay < 7) return `${diffDay} ngày trước`;
    return formatDate(d);
}

/**
 * Format phone number
 * e.g. "0912345678" → "0912 345 678"
 */
export function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
}

/**
 * Generate order code
 * e.g. "SMK-20260220-001"
 */
export function generateOrderCode(sequenceNum: number): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(sequenceNum).padStart(3, '0');
    return `SMK-${dateStr}-${seq}`;
}

/**
 * Slugify Vietnamese text
 */
export function slugify(text: string): string {
    const from = 'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
    const to = 'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd';

    let str = text.toLowerCase().trim();
    for (let i = 0; i < from.length; i++) {
        str = str.replace(new RegExp(from[i], 'g'), to[i]);
    }
    return str
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLen: number): string {
    if (text.length <= maxLen) return text;
    return text.slice(0, maxLen - 3) + '...';
}

/**
 * Order status labels in Vietnamese
 */
export const ORDER_STATUS_LABELS: Record<string, string> = {
    CREATED: 'Đã tạo',
    CONFIRMED: 'Đã xác nhận',
    PAID: 'Đã thanh toán',
    SHIPPING: 'Đang giao hàng',
    DELIVERED: 'Đã giao',
    RETURNED: 'Đã hoàn trả',
    CANCELLED: 'Đã huỷ',
};

/**
 * Commission status labels
 */
export const COMMISSION_STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    AVAILABLE: 'Có thể rút',
    REVERSED: 'Đã trừ',
    PAID: 'Đã thanh toán',
};

/**
 * Partner level labels
 */
export const PARTNER_LEVEL_LABELS: Record<string, string> = {
    AFFILIATE: 'Affiliate',
    AGENT: 'Đại lý',
    LEADER: 'Leader',
};
