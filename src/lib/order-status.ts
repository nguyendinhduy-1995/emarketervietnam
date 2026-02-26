/**
 * Order Status Machine for CRM Provisioning Pipeline
 * 
 * Flow:
 *   DRAFT → PAID_WAITING_DOMAIN_VERIFY → DOMAIN_VERIFIED → DEPLOYING → DELIVERED_ACTIVE
 *   (non-CRM products still go directly to PAID)
 */

export const OrderStatus = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    PAID: 'PAID',
    PAID_WAITING_DOMAIN_VERIFY: 'PAID_WAITING_DOMAIN_VERIFY',
    DOMAIN_VERIFIED: 'DOMAIN_VERIFIED',
    DEPLOYING: 'DEPLOYING',
    DELIVERED_ACTIVE: 'DELIVERED_ACTIVE',
    FAILED: 'FAILED',
    REFUNDED: 'REFUNDED',
    PARTIAL_REFUND: 'PARTIAL_REFUND',
} as const;

export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

/** CRM-specific status progression */
export const CRM_STATUS_FLOW: OrderStatusType[] = [
    OrderStatus.PAID_WAITING_DOMAIN_VERIFY,
    OrderStatus.DOMAIN_VERIFIED,
    OrderStatus.DEPLOYING,
    OrderStatus.DELIVERED_ACTIVE,
];

/** Valid transitions */
const VALID_TRANSITIONS: Record<string, string[]> = {
    DRAFT: ['PENDING', 'PAID', 'PAID_WAITING_DOMAIN_VERIFY'],
    PENDING: ['PAID', 'PAID_WAITING_DOMAIN_VERIFY', 'FAILED'],
    PAID: ['REFUNDED', 'PARTIAL_REFUND'],
    PAID_WAITING_DOMAIN_VERIFY: ['DOMAIN_VERIFIED', 'DEPLOYING', 'REFUNDED'],
    DOMAIN_VERIFIED: ['DEPLOYING', 'REFUNDED'],
    DEPLOYING: ['DELIVERED_ACTIVE', 'FAILED'],
    DELIVERED_ACTIVE: ['REFUNDED'],
    FAILED: ['DEPLOYING'], // retry
};

export function canTransition(from: string, to: string): boolean {
    return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Labels for UI */
export const ORDER_STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Nháp',
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán',
    PAID_WAITING_DOMAIN_VERIFY: 'Chờ xác minh domain',
    DOMAIN_VERIFIED: 'Domain đã xác minh',
    DEPLOYING: 'Đang triển khai',
    DELIVERED_ACTIVE: 'Đã kích hoạt',
    FAILED: 'Thất bại',
    REFUNDED: 'Đã hoàn tiền',
    PARTIAL_REFUND: 'Hoàn tiền một phần',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
    DRAFT: '#9ca3af',
    PENDING: '#f59e0b',
    PAID: '#22c55e',
    PAID_WAITING_DOMAIN_VERIFY: '#8b5cf6',
    DOMAIN_VERIFIED: '#3b82f6',
    DEPLOYING: '#f97316',
    DELIVERED_ACTIVE: '#22c55e',
    FAILED: '#ef4444',
    REFUNDED: '#6b7280',
    PARTIAL_REFUND: '#6b7280',
};

/** Icons for each status step */
export const ORDER_STATUS_ICONS: Record<string, string> = {
    PAID_WAITING_DOMAIN_VERIFY: '🌐',
    DOMAIN_VERIFIED: '✅',
    DEPLOYING: '🚀',
    DELIVERED_ACTIVE: '🎉',
};
