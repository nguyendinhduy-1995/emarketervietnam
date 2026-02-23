// ─── Module Keys ──────────────────────────────────────────
export const MODULE_KEYS = {
    INBOX: 'inbox',
    AUTOMATION: 'automation',
    MEMBERSHIP: 'membership',
    INVENTORY: 'inventory',
    COMMISSION: 'commission',
    BOOKING: 'booking',
    ANALYTICS: 'analytics',
    AI_SUITE: 'ai_suite',
} as const;

// ─── Plan Keys ────────────────────────────────────────────
export const PLAN_KEYS = {
    FREE: 'FREE',
    STARTER: 'STARTER',
    PRO: 'PRO',
} as const;

// ─── Subscription Status ──────────────────────────────────
export const SUB_STATUS = {
    TRIAL: 'TRIAL',
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    SUSPENDED: 'SUSPENDED',
} as const;

// ─── Provisioning Status ──────────────────────────────────
export const PROVISION_STATUS = {
    PENDING: 'PENDING',
    ACTIVE: 'ACTIVE',
    FAILED: 'FAILED',
} as const;

// ─── Order Status ─────────────────────────────────────────
export const ORDER_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    EXPIRED: 'EXPIRED',
    NEED_REVIEW: 'NEED_REVIEW',
} as const;

// ─── Roles ────────────────────────────────────────────────
export const ROLES = {
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
} as const;

// ─── Default Modules (seed data) ──────────────────────────
export const DEFAULT_MODULES = [
    {
        key: MODULE_KEYS.INBOX,
        name: 'Inbox',
        description: 'Quản lý tin nhắn đa kênh: Facebook, Zalo, SMS. Trả lời khách hàng ngay từ CRM.',
        priceMonthly: 199000,
        icon: '💬',
    },
    {
        key: MODULE_KEYS.AUTOMATION,
        name: 'Automation',
        description: 'Tự động nhắc lịch, gửi chúc mừng sinh nhật, follow-up khách hàng thông minh.',
        priceMonthly: 299000,
        icon: '⚡',
    },
    {
        key: MODULE_KEYS.MEMBERSHIP,
        name: 'Membership',
        description: 'Chương trình thẻ thành viên, tích điểm, ưu đãi khách quen.',
        priceMonthly: 149000,
        icon: '🎫',
    },
    {
        key: MODULE_KEYS.INVENTORY,
        name: 'Inventory',
        description: 'Quản lý tồn kho sản phẩm, nguyên vật liệu Spa.',
        priceMonthly: 199000,
        icon: '📦',
    },
    {
        key: MODULE_KEYS.COMMISSION,
        name: 'Commission',
        description: 'Tính hoa hồng nhân viên tự động theo doanh số, dịch vụ.',
        priceMonthly: 149000,
        icon: '💰',
    },
    {
        key: MODULE_KEYS.BOOKING,
        name: 'Online Booking',
        description: 'Đặt lịch online cho khách hàng, tích hợp website & fanpage.',
        priceMonthly: 249000,
        icon: '📅',
    },
    {
        key: MODULE_KEYS.ANALYTICS,
        name: 'Analytics',
        description: 'Báo cáo chi tiết doanh thu, khách hàng, nhân viên. Dashboard thông minh.',
        priceMonthly: 299000,
        icon: '📊',
    },
    {
        key: MODULE_KEYS.AI_SUITE,
        name: 'AI Suite',
        description: 'Trợ lý AI: tư vấn khách, phân tích ảnh da, gợi ý dịch vụ phù hợp.',
        priceMonthly: 499000,
        icon: '🤖',
    },
];

// ─── Bank Info (for QR) ───────────────────────────────────
export const BANK_INFO = {
    bankName: 'Vietcombank',
    accountNumber: '0123456789',
    accountHolder: 'CONG TY EMARKETER',
};
