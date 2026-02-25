/**
 * Demo mode utilities.
 * 
 * Detect if current instance is in demo mode and apply guardrails.
 */

/**
 * Check if current request is from a demo instance.
 * Demo detection methods (in order):
 * 1. ENV: DEMO_MODE=true
 * 2. Domain: starts with "demo" or "crm-spa" subdomain of emarketervietnam.vn
 * 3. Header: X-Demo-Mode: true
 */
export function isDemo(): boolean {
    if (process.env.DEMO_MODE === 'true') return true;
    // Domain-based detection happens at middleware level
    return false;
}

/**
 * Demo rate limits per feature
 */
export const DEMO_LIMITS = {
    AI_GENERATE: { maxPerSession: 5, maxPerDay: 10, label: 'Tạo nội dung AI' },
    AI_ASSISTANT: { maxPerSession: 10, maxPerDay: 20, label: 'AI Trợ lý' },
    MESSAGING: { maxPerSession: 3, maxPerDay: 5, label: 'Nhắn tin' },
    DATA_EXPORT: { maxPerSession: 1, maxPerDay: 2, label: 'Xuất dữ liệu' },
} as const;

/**
 * Demo quota check. Returns true if allowed, false if exceeded.
 * In demo mode, AI/PAYG features are capped.
 */
export function checkDemoQuota(feature: keyof typeof DEMO_LIMITS, currentCount: number): { allowed: boolean; message?: string } {
    if (!isDemo()) return { allowed: true };

    const limit = DEMO_LIMITS[feature];
    if (!limit) return { allowed: true };

    if (currentCount >= limit.maxPerSession) {
        return {
            allowed: false,
            message: `Demo giới hạn ${limit.maxPerSession} lượt ${limit.label}. Mua bản chính thức để dùng không giới hạn.`,
        };
    }
    return { allowed: true };
}

/**
 * Demo guardrail: block destructive operations
 */
export const BLOCKED_IN_DEMO = [
    'DELETE_ALL_LEADS',
    'DELETE_ALL_ACCOUNTS',
    'EXPORT_FULL_DATABASE',
    'CHANGE_SYSTEM_SETTINGS',
    'DELETE_WORKSPACE',
    'TRANSFER_OWNERSHIP',
] as const;

export function isDemoBlocked(operation: string): boolean {
    if (!isDemo()) return false;
    return (BLOCKED_IN_DEMO as readonly string[]).includes(operation);
}
