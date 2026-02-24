/**
 * Centralized VND money formatting utility for the entire repo.
 * Handles all edge cases: null, undefined, NaN, Decimal, BigInt, string.
 *
 * Usage:
 *   import { vnd, vndShort } from '@/lib/format';
 *   vnd(1500000)      → "1.500.000 đ"
 *   vndShort(1500000)  → "1,5tr"
 *   vndShort(50000)    → "50k"
 */

/**
 * Full VND format: "1.500.000đ"
 * Safe for any input type (number, string, null, undefined, Decimal, BigInt).
 */
export function vnd(n: unknown): string {
    const num = toSafeNumber(n);
    return num.toLocaleString('vi-VN') + ' đ';
}

/**
 * Short VND format for dashboards:
 *   >= 1,000,000,000 → "1.5tỷ"
 *   >= 1,000,000     → "1.5tr"
 *   >= 1,000         → "50k"
 *   < 1,000          → "500đ"
 */
export function vndShort(n: unknown): string {
    const num = toSafeNumber(n);
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')} tr`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
    return `${num} đ`;
}

/**
 * Safely convert any value to a number.
 * Handles: number, string, null, undefined, NaN, BigInt, Prisma Decimal.
 */
function toSafeNumber(n: unknown): number {
    if (n === null || n === undefined) return 0;
    if (typeof n === 'bigint') return Number(n);
    if (typeof n === 'string') {
        const parsed = parseFloat(n);
        return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof n === 'number') return isNaN(n) ? 0 : n;
    // Prisma Decimal or any object with toNumber()
    if (typeof n === 'object' && n !== null) {
        if ('toNumber' in n && typeof (n as { toNumber: () => number }).toNumber === 'function') {
            return (n as { toNumber: () => number }).toNumber();
        }
    }
    return Number(n) || 0;
}
