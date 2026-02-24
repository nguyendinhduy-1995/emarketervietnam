// ─── Feature Flag Keys & Configuration ────────────────────
// Each advanced feature can be toggled independently

export const FEATURE_KEYS = {
    ADV_SHIPPING: 'ADV_SHIPPING',
    ADV_WAREHOUSE: 'ADV_WAREHOUSE',
    ADV_PARTNER: 'ADV_PARTNER',
    ADV_RETURNS: 'ADV_RETURNS',
    ADV_REVIEWS: 'ADV_REVIEWS',
    ADV_AI: 'ADV_AI',
    ADV_ANALYTICS: 'ADV_ANALYTICS',
    ADV_AUTOMATION: 'ADV_AUTOMATION',
    ADV_TRYON: 'ADV_TRYON',
    ADV_LOYALTY: 'ADV_LOYALTY',
    ADV_PRESCRIPTION: 'ADV_PRESCRIPTION',
    ADV_SEO: 'ADV_SEO',
    ADV_SUPPORT: 'ADV_SUPPORT',
    ADV_SHOP_EXTRAS: 'ADV_SHOP_EXTRAS',
} as const;

export type FeatureKey = keyof typeof FEATURE_KEYS;

// Feature metadata for display + real-world impact
export interface FeatureMeta {
    label: string;
    icon: string;
    desc: string;
    longDesc: string;
    impact: string;
    category: string;
    price: string;
    highlights: string[];
}

export const FEATURE_META: Record<FeatureKey, FeatureMeta> = {
    ADV_SHIPPING: {
        label: 'Multi-carrier Shipping',
        icon: '🚚',
        desc: 'Tích hợp đa nhà vận chuyển',
        longDesc: 'Kết nối trực tiếp với GHN, GHTK, ViettelPost, J&T, NinjaVan, VNPost, AhaMove. Tự động tạo đơn vận chuyển, tracking realtime qua webhook, cập nhật trạng thái đơn hàng tự động.',
        impact: 'Giảm 70% thời gian xử lý vận chuyển. Khách hàng tracking đơn realtime → giảm 40% câu hỏi "đơn tới đâu rồi?"',
        category: 'Vận hành',
        price: '290.000₫/tháng',
        highlights: ['7 nhà vận chuyển', 'Webhook realtime', 'SLA monitoring', 'COD auto-reconcile'],
    },
    ADV_WAREHOUSE: {
        label: 'Kho hàng & Kiểm kê',
        icon: '🏭',
        desc: 'Quản lý multi-warehouse chuyên nghiệp',
        longDesc: 'Quản lý nhiều kho hàng (HCM, HN, ...). Phiếu nhập/xuất/điều chỉnh với quy trình duyệt. Kiểm kê tồn kho (stocktake). Ledger tồn kho realtime — không bao giờ bán quá tồn.',
        impact: 'Giảm 90% sai lệch tồn kho. Hết hàng "ảo" → tăng 15% tỷ lệ chốt đơn thành công.',
        category: 'Vận hành',
        price: '290.000₫/tháng',
        highlights: ['Multi-warehouse', 'Phiếu nhập/xuất/điều chỉnh', 'Kiểm kê stocktake', 'Ledger realtime'],
    },
    ADV_PARTNER: {
        label: 'Affiliate / Đối tác',
        icon: '🤝',
        desc: 'Hệ thống đối tác & hoa hồng tự động',
        longDesc: 'Portal riêng cho đối tác (10 trang). Hoa hồng tự động theo rule (global/category/product). Ví đối tác + chi trả. Phát hiện gian lận (fake orders, self-referral). 3 cấp: Affiliate → Agent → Leader.',
        impact: 'Trung bình mỗi đối tác mang về 8-15 đơn/tháng. Hệ thống referral tăng 25-40% doanh thu khách mới.',
        category: 'Tăng trưởng',
        price: '490.000₫/tháng',
        highlights: ['Portal 10 trang', '3 cấp bậc', 'Commission rules', 'Fraud detection'],
    },
    ADV_RETURNS: {
        label: 'Đổi trả / Bảo hành',
        icon: '↩️',
        desc: 'Quy trình đổi trả & bảo hành chuyên nghiệp',
        longDesc: 'Quản lý đổi trả (return), đổi sản phẩm (exchange), bảo hành (warranty). Khách upload ảnh/video bằng chứng. Admin duyệt/từ chối với ghi chú. Mã RMA tự động tạo.',
        impact: 'Xử lý yêu cầu đổi trả nhanh hơn 60%. Tăng niềm tin khách hàng → 20% khách quay lại mua.',
        category: 'Dịch vụ',
        price: '190.000₫/tháng',
        highlights: ['3 loại: return/exchange/warranty', 'Upload bằng chứng', 'Mã RMA tự động', 'Admin approval'],
    },
    ADV_REVIEWS: {
        label: 'Đánh giá & Q&A',
        icon: '⭐',
        desc: 'Hệ thống đánh giá & hỏi đáp sản phẩm',
        longDesc: 'Khách đánh giá sản phẩm (1-5 sao + ảnh/video). Chỉ cho đánh giá khi đã mua (verified). Phát hiện spam tự động. Section Q&A — khách hỏi, admin trả lời.',
        impact: 'Sản phẩm có reviews tăng 35% tỷ lệ chuyển đổi. Q&A giảm 50% câu hỏi inbox/Zalo.',
        category: 'Bán hàng',
        price: '190.000₫/tháng',
        highlights: ['Rating + media', 'Verified purchase only', 'Anti-spam', 'Q&A section'],
    },
    ADV_AI: {
        label: 'AI Content Creator',
        icon: '🤖',
        desc: 'Tạo nội dung sản phẩm bằng AI',
        longDesc: 'AI viết mô tả sản phẩm cho website, Facebook, TikTok, Zalo. 4 tone: casual, premium, young, KOL review. One-click apply vào sản phẩm. Lưu lịch sử để so sánh.',
        impact: 'Viết mô tả nhanh x10 (từ 30 phút → 3 phút). Chất lượng đồng đều, tối ưu SEO tự động.',
        category: 'Marketing',
        price: 'PAYG: 2.000-5.000₫/lượt',
        highlights: ['4 platforms', '4 tone of voice', 'One-click apply', 'Token tracking'],
    },
    ADV_ANALYTICS: {
        label: 'Advanced Analytics',
        icon: '📈',
        desc: 'Phân tích nâng cao doanh thu & khách hàng',
        longDesc: 'Dashboard phân tích chuyên sâu: doanh thu theo thời gian, cohort khách hàng (mới/quay lại), funnel chuyển đổi (view → cart → checkout → purchase), top sản phẩm, pattern mua hàng.',
        impact: 'Ra quyết định dựa trên dữ liệu → tăng 20% hiệu quả marketing. Phát hiện trend sớm 2-3 tuần.',
        category: 'Phân tích',
        price: '390.000₫/tháng',
        highlights: ['Revenue analytics', 'Customer cohorts', 'Conversion funnels', 'Product performance'],
    },
    ADV_AUTOMATION: {
        label: 'Marketing Automation',
        icon: '⚡',
        desc: 'Tự động hóa marketing & CSKH',
        longDesc: 'Email/SMS tự động khi có trigger (đơn hàng, bỏ giỏ, sinh nhật). Nhắc giỏ hàng bỏ quên (abandoned cart recovery). Lịch gửi chiến dịch định kỳ. Gửi Zalo OA notification.',
        impact: 'Abandoned cart recovery thu hồi 10-15% giỏ hàng bỏ quên. Email sinh nhật tăng 30% tỷ lệ mua lại.',
        category: 'Marketing',
        price: '390.000₫/tháng',
        highlights: ['Abandoned cart recovery', 'Birthday/anniversary triggers', 'Scheduled campaigns', 'Zalo OA'],
    },
    ADV_TRYON: {
        label: 'Virtual Try-on (AR)',
        icon: '👓',
        desc: 'Thử kính ảo bằng camera AR',
        longDesc: 'Khách hàng bật camera → AI detect khuôn mặt → overlay kính lên thời gian thực. Hỗ trợ mobile-first. Chụp ảnh chia sẻ. Tăng trải nghiệm mua kính online.',
        impact: 'Tăng 45% thời gian trên trang sản phẩm. Giảm 30% tỷ lệ đổi trả do chọn sai kiểu dáng.',
        category: 'Trải nghiệm',
        price: '490.000₫/tháng',
        highlights: ['AR face detection', 'Realtime overlay', 'Share to social', 'Mobile-first'],
    },
    ADV_LOYALTY: {
        label: 'Loyalty & Points',
        icon: '🎁',
        desc: 'Chương trình tích điểm & đổi thưởng',
        longDesc: 'Tích điểm khi mua hàng (1.000₫ = 1 điểm). Đổi điểm lấy voucher/giảm giá. Hạng thành viên (Bronze → Silver → Gold → Diamond). Ưu đãi riêng theo hạng.',
        impact: 'Khách có loyalty card quay lại mua gấp 2.7x so với khách thường. Tăng 35% LTV (lifetime value).',
        category: 'Giữ chân',
        price: '290.000₫/tháng',
        highlights: ['Tích điểm tự động', 'Đổi voucher/giảm giá', '4 membership tiers', 'Ưu đãi theo hạng'],
    },
    ADV_PRESCRIPTION: {
        label: 'Đơn thuốc mắt',
        icon: '📋',
        desc: 'Quản lý đơn thuốc & tư vấn tròng kính',
        longDesc: 'Form nhập đơn thuốc chuẩn (SPH, CYL, AXIS, PD cho từng mắt). Upload ảnh đơn thuốc. Gắn vào đơn hàng khi checkout. Lưu lịch sử đơn thuốc theo khách.',
        impact: 'Giảm 80% sai sót đơn thuốc (nhập form thay vì ghi tay). Tăng 25% giá trị đơn hàng nhờ upsell tròng kính.',
        category: 'Chuyên ngành',
        price: '190.000₫/tháng',
        highlights: ['Form SPH/CYL/AXIS/PD', 'Upload ảnh đơn', 'Gắn vào order', 'Lịch sử theo khách'],
    },
    ADV_SEO: {
        label: 'SEO Tools Pro',
        icon: '🔍',
        desc: 'Công cụ SEO nâng cao cho cửa hàng',
        longDesc: 'Editor meta title/description nâng cao. Structured data tự động tạo (Product, FAQ, Review). SEO audit report — phát hiện lỗi SEO. Keywords suggestion cho sản phẩm kính.',
        impact: 'Tăng 40-60% organic traffic sau 3 tháng. Tiết kiệm 5-10 triệu/tháng chi phí quảng cáo.',
        category: 'Marketing',
        price: '990.000₫ (trọn đời)',
        highlights: ['Meta editor nâng cao', 'Structured data auto', 'SEO audit report', 'Keyword suggestions'],
    },
    ADV_SUPPORT: {
        label: 'Customer Support',
        icon: '🎧',
        desc: 'Hệ thống CSKH đa kênh',
        longDesc: 'Ticket system cho yêu cầu hỗ trợ. Live chat widget trên trang web. Quản lý FAQ (câu hỏi thường gặp). Phân loại ticket theo priority. SLA tracking.',
        impact: 'Phản hồi khách nhanh hơn 3x. Giảm 60% tin nhắn Zalo/Facebook nhờ FAQ tự phục vụ.',
        category: 'Dịch vụ',
        price: '290.000₫/tháng',
        highlights: ['Ticket system', 'Live chat widget', 'FAQ management', 'SLA tracking'],
    },
    ADV_SHOP_EXTRAS: {
        label: 'Shop Extras',
        icon: '🛍️',
        desc: 'Tính năng mua sắm nâng cao',
        longDesc: 'Wishlist (lưu yêu thích). So sánh sản phẩm side-by-side. Quiz tìm kính phù hợp (khuôn mặt, phong cách). Blog chia sẻ tips & trends. Đặt lịch hẹn thử kính tại cửa hàng. Bundle combo giảm giá.',
        impact: 'Quiz tìm kính tăng 25% tỷ lệ chuyển đổi. Wishlist tăng 18% tỷ lệ quay lại. Booking tăng 40% khách offline.',
        category: 'Trải nghiệm',
        price: '190.000₫/tháng',
        highlights: ['Wishlist', 'So sánh sản phẩm', 'Quiz tìm kính', 'Blog', 'Đặt lịch hẹn', 'Bundle combo'],
    },
};

// Map admin routes to required feature keys
export const ROUTE_FEATURE_MAP: Record<string, FeatureKey> = {
    '/admin/shipping': 'ADV_SHIPPING',
    '/admin/warehouse': 'ADV_WAREHOUSE',
    '/admin/partners': 'ADV_PARTNER',
    '/admin/commissions': 'ADV_PARTNER',
    '/admin/payouts': 'ADV_PARTNER',
    '/admin/fraud': 'ADV_PARTNER',
    '/admin/returns': 'ADV_RETURNS',
    '/admin/reviews': 'ADV_REVIEWS',
    '/admin/ai': 'ADV_AI',
    '/admin/analytics': 'ADV_ANALYTICS',
    '/admin/automation': 'ADV_AUTOMATION',
    '/admin/prescription': 'ADV_PRESCRIPTION',
    '/admin/seo': 'ADV_SEO',
    '/admin/support': 'ADV_SUPPORT',
};

// Tenant entitlement config
export interface TenantFeatures {
    enabledFeatures: FeatureKey[];
    limits?: Record<string, number>; // e.g. { ai_credits: 100 }
}

// Default: ALL features ON (for backward compatibility / development)
const DEFAULT_FEATURES: TenantFeatures = {
    enabledFeatures: Object.keys(FEATURE_KEYS) as FeatureKey[],
};

// In-memory cache (per deployment instance)
let _cachedFeatures: TenantFeatures | null = null;
let _cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get feature config for the current tenant.
 * Sources (in priority order):
 * 1. Environment variable SMK_FEATURES (comma-separated keys)
 * 2. Hub entitlement API (future)
 * 3. Default: all ON
 */
export function getTenantFeatures(): TenantFeatures {
    // Check cache
    if (_cachedFeatures && Date.now() < _cacheExpiry) {
        return _cachedFeatures;
    }

    // Source 1: Environment variable
    const envFeatures = process.env.SMK_FEATURES;
    if (envFeatures) {
        if (envFeatures === 'ALL') {
            _cachedFeatures = DEFAULT_FEATURES;
        } else if (envFeatures === 'NONE') {
            _cachedFeatures = { enabledFeatures: [] };
        } else {
            const keys = envFeatures.split(',').map(k => k.trim()).filter(k => k in FEATURE_KEYS) as FeatureKey[];
            _cachedFeatures = { enabledFeatures: keys };
        }
        _cacheExpiry = Date.now() + CACHE_TTL_MS;
        return _cachedFeatures;
    }

    // Default: all features ON
    _cachedFeatures = DEFAULT_FEATURES;
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
    return _cachedFeatures;
}

/**
 * Check if a specific feature is enabled
 */
export function isFeatureEnabled(key: FeatureKey): boolean {
    const features = getTenantFeatures();
    return features.enabledFeatures.includes(key);
}

/**
 * Check if the feature required for a route is enabled
 */
export function isRouteEnabled(path: string): boolean {
    const featureKey = ROUTE_FEATURE_MAP[path];
    if (!featureKey) return true; // core routes always enabled
    return isFeatureEnabled(featureKey);
}

/**
 * Reset feature cache (e.g. after entitlement update)
 */
export function resetFeatureCache() {
    _cachedFeatures = null;
    _cacheExpiry = 0;
}
