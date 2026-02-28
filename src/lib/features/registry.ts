/**
 * Feature Key Registry — Single source of truth for all feature keys.
 * Each key maps to a moduleKey in the Entitlement model.
 */

// ─── Feature Keys ────────────────────────────────────────
export const FeatureKey = {
    // Core features (always enabled, no entitlement check)
    CORE_DASHBOARD: 'CORE_DASHBOARD',
    CORE_LEADS: 'CORE_LEADS',
    CORE_TASKS: 'CORE_TASKS',
    CORE_BILLING: 'CORE_BILLING',
    CORE_MARKETPLACE: 'CORE_MARKETPLACE',
    CORE_TEAM: 'CORE_TEAM',
    CORE_SUPPORT: 'CORE_SUPPORT',

    // AI Add-ons
    AI_ASSISTANT: 'AI_ASSISTANT',
    AI_ANALYTICS: 'AI_ANALYTICS',
    AI_LEAD_SCORE: 'AI_LEAD_SCORE',
    AI_CHURN: 'AI_CHURN',
    AI_GENERATE: 'AI_GENERATE',
    AI_SUMMARY: 'AI_SUMMARY',
    AI_SETTINGS: 'AI_SETTINGS',

    // Automation Add-ons
    AUTOMATION: 'AUTOMATION',
    DRIP_CAMPAIGN: 'DRIP_CAMPAIGN',

    // Communication Add-ons
    MESSAGING: 'MESSAGING',
    EMAIL_TEMPLATES: 'EMAIL_TEMPLATES',

    // Data & Content
    DATA_EXPORT: 'DATA_EXPORT',
    ONLINE_BOOKING: 'ONLINE_BOOKING',
    CMS: 'CMS',
    DIGITAL_ASSETS: 'DIGITAL_ASSETS',

    // Commerce
    AFFILIATES: 'AFFILIATES',
    KNOWLEDGE_BASE: 'KNOWLEDGE_BASE',
    FINANCE_ADMIN: 'FINANCE_ADMIN',

    // App Modules (managed via CRM)
    ESTUDIO_ADMIN: 'ESTUDIO_ADMIN',
} as const;

export type FeatureKeyType = typeof FeatureKey[keyof typeof FeatureKey];

// ─── Core Features (always enabled — skip entitlement check) ─
export const CORE_FEATURES = new Set<string>([
    FeatureKey.CORE_DASHBOARD,
    FeatureKey.CORE_LEADS,
    FeatureKey.CORE_TASKS,
    FeatureKey.CORE_BILLING,
    FeatureKey.CORE_MARKETPLACE,
    FeatureKey.CORE_TEAM,
    FeatureKey.CORE_SUPPORT,
]);

// ─── Feature Tiers ───────────────────────────────────────
export const FEATURE_TIER: Record<string, 'CORE' | 'ADD_ON' | 'ADMIN'> = {
    [FeatureKey.CORE_DASHBOARD]: 'CORE',
    [FeatureKey.CORE_LEADS]: 'CORE',
    [FeatureKey.CORE_TASKS]: 'CORE',
    [FeatureKey.CORE_BILLING]: 'CORE',
    [FeatureKey.CORE_MARKETPLACE]: 'CORE',
    [FeatureKey.CORE_TEAM]: 'CORE',
    [FeatureKey.CORE_SUPPORT]: 'CORE',
    [FeatureKey.AI_ASSISTANT]: 'ADD_ON',
    [FeatureKey.AI_ANALYTICS]: 'ADD_ON',
    [FeatureKey.AI_LEAD_SCORE]: 'ADD_ON',
    [FeatureKey.AI_CHURN]: 'ADD_ON',
    [FeatureKey.AI_GENERATE]: 'ADD_ON',
    [FeatureKey.AI_SUMMARY]: 'ADD_ON',
    [FeatureKey.AI_SETTINGS]: 'ADD_ON',
    [FeatureKey.AUTOMATION]: 'ADD_ON',
    [FeatureKey.DRIP_CAMPAIGN]: 'ADD_ON',
    [FeatureKey.MESSAGING]: 'ADD_ON',
    [FeatureKey.EMAIL_TEMPLATES]: 'ADD_ON',
    [FeatureKey.DATA_EXPORT]: 'ADD_ON',
    [FeatureKey.ONLINE_BOOKING]: 'ADD_ON',
    [FeatureKey.CMS]: 'ADD_ON',
    [FeatureKey.DIGITAL_ASSETS]: 'ADD_ON',
    [FeatureKey.AFFILIATES]: 'ADD_ON',
    [FeatureKey.KNOWLEDGE_BASE]: 'ADD_ON',
    [FeatureKey.FINANCE_ADMIN]: 'ADMIN',
    [FeatureKey.ESTUDIO_ADMIN]: 'ADD_ON',
};

// ─── Feature Dependencies ────────────────────────────────
export const FEATURE_DEPS: Partial<Record<string, string[]>> = {
    [FeatureKey.DRIP_CAMPAIGN]: [FeatureKey.AUTOMATION],
    [FeatureKey.AI_ANALYTICS]: [FeatureKey.AI_SETTINGS],
    [FeatureKey.AI_LEAD_SCORE]: [FeatureKey.AI_SETTINGS],
    [FeatureKey.AI_CHURN]: [FeatureKey.AI_SETTINGS],
    [FeatureKey.AI_GENERATE]: [FeatureKey.AI_SETTINGS],
    [FeatureKey.AI_SUMMARY]: [FeatureKey.AI_SETTINGS],
    [FeatureKey.AI_ASSISTANT]: [FeatureKey.AI_SETTINGS],
};

// ─── Feature Labels (Vietnamese) ─────────────────────────
export const FEATURE_LABELS: Record<string, string> = {
    [FeatureKey.CORE_DASHBOARD]: 'Bảng điều khiển',
    [FeatureKey.CORE_LEADS]: 'Quản lý Lead',
    [FeatureKey.CORE_TASKS]: 'Quản lý công việc',
    [FeatureKey.CORE_BILLING]: 'Ví & Thanh toán',
    [FeatureKey.CORE_MARKETPLACE]: 'Marketplace',
    [FeatureKey.CORE_TEAM]: 'Quản lý nhóm',
    [FeatureKey.CORE_SUPPORT]: 'Hỗ trợ',
    [FeatureKey.AI_ASSISTANT]: 'AI Trợ lý',
    [FeatureKey.AI_ANALYTICS]: 'AI Phân tích',
    [FeatureKey.AI_LEAD_SCORE]: 'AI Chấm điểm Lead',
    [FeatureKey.AI_CHURN]: 'AI Dự đoán rời bỏ',
    [FeatureKey.AI_GENERATE]: 'AI Tạo nội dung',
    [FeatureKey.AI_SUMMARY]: 'AI Tóm tắt',
    [FeatureKey.AI_SETTINGS]: 'Cài đặt AI',
    [FeatureKey.AUTOMATION]: 'Tự động hóa',
    [FeatureKey.DRIP_CAMPAIGN]: 'Chiến dịch Drip',
    [FeatureKey.MESSAGING]: 'Nhắn tin (SMS/Zalo)',
    [FeatureKey.EMAIL_TEMPLATES]: 'Mẫu Email',
    [FeatureKey.DATA_EXPORT]: 'Xuất dữ liệu',
    [FeatureKey.ONLINE_BOOKING]: 'Đặt lịch trực tuyến',
    [FeatureKey.CMS]: 'CMS / Blog',
    [FeatureKey.DIGITAL_ASSETS]: 'Sản phẩm số',
    [FeatureKey.AFFILIATES]: 'Hệ thống CTV',
    [FeatureKey.KNOWLEDGE_BASE]: 'Trung tâm kiến thức',
    [FeatureKey.FINANCE_ADMIN]: 'Tài chính & Đối soát',
    [FeatureKey.ESTUDIO_ADMIN]: 'eStudio Manager',
};
