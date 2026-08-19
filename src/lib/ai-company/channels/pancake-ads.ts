export const PANCAKE_POS_API_BASE_URL = "https://pos.pages.fm/api/v1";

export const pancakeAdsEndpoints = {
  adAccounts: (shopId: string | number) => `/shops/${shopId}/ads_manager/ad_accounts`,
  campaigns: (shopId: string | number) => `/shops/${shopId}/ads_manager/campaigns_v2`,
  adSets: (shopId: string | number) => `/shops/${shopId}/ads_manager/ad_sets_v2`,
  ads: (shopId: string | number) => `/shops/${shopId}/ads_manager/ads_v2`,
} as const;

export type CommerceChannel =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "shopee"
  | "lazada"
  | "website"
  | "offline"
  | "other";

export type AdsEntityLevel = "account" | "campaign" | "adset" | "ad";

export interface NormalizedAdsMetric {
  businessUnitId: string;
  source: "pancake";
  channel: CommerceChannel;
  level: AdsEntityLevel;
  entityId: string;
  entityName: string;
  dateKey: string;
  spend: number;
  impressions?: number;
  reach?: number;
  clicks?: number;
  conversations?: number;
  leads?: number;
  orders?: number;
  deliveredOrders?: number;
  attributedRevenue?: number;
  totalBusinessRevenue?: number;
  refundsAndReturns?: number;
}

export interface DerivedChannelMetrics {
  cpm: number | null;
  ctr: number | null;
  cpc: number | null;
  costPerConversation: number | null;
  costPerLead: number | null;
  cacPerOrder: number | null;
  cacPerDeliveredOrder: number | null;
  roas: number | null;
  mer: number | null;
  returnRate: number | null;
}

const safeDivide = (numerator: number, denominator?: number) => {
  if (!denominator || denominator <= 0) return null;
  return numerator / denominator;
};

export function deriveChannelMetrics(metric: NormalizedAdsMetric): DerivedChannelMetrics {
  const cpmRatio = safeDivide(metric.spend, metric.impressions);

  return {
    cpm: cpmRatio === null ? null : cpmRatio * 1000,
    ctr: safeDivide(metric.clicks ?? 0, metric.impressions),
    cpc: safeDivide(metric.spend, metric.clicks),
    costPerConversation: safeDivide(metric.spend, metric.conversations),
    costPerLead: safeDivide(metric.spend, metric.leads),
    cacPerOrder: safeDivide(metric.spend, metric.orders),
    cacPerDeliveredOrder: safeDivide(metric.spend, metric.deliveredOrders),
    roas: safeDivide(metric.attributedRevenue ?? 0, metric.spend),
    mer: safeDivide(metric.totalBusinessRevenue ?? 0, metric.spend),
    returnRate: safeDivide(metric.refundsAndReturns ?? 0, metric.orders),
  };
}

export interface ChannelRecommendationInput {
  current: NormalizedAdsMetric;
  previous?: NormalizedAdsMetric;
  targetCacDelivered?: number;
  minimumRoas?: number;
  minimumMer?: number;
  maximumReturnRate?: number;
}

export interface ChannelRecommendation {
  severity: "info" | "watch" | "warning" | "critical";
  code: string;
  title: string;
  reason: string;
  suggestedAction: string;
}

export function buildChannelRecommendations(input: ChannelRecommendationInput): ChannelRecommendation[] {
  const current = deriveChannelMetrics(input.current);
  const previous = input.previous ? deriveChannelMetrics(input.previous) : null;
  const recommendations: ChannelRecommendation[] = [];

  if (
    input.targetCacDelivered &&
    current.cacPerDeliveredOrder !== null &&
    current.cacPerDeliveredOrder > input.targetCacDelivered
  ) {
    recommendations.push({
      severity: current.cacPerDeliveredOrder > input.targetCacDelivered * 1.2 ? "critical" : "warning",
      code: "CAC_DELIVERED_OVER_TARGET",
      title: "CAC đơn giao vượt ngưỡng",
      reason: `CAC đơn giao hiện tại ${Math.round(current.cacPerDeliveredOrder).toLocaleString("vi-VN")}đ, cao hơn mục tiêu ${Math.round(input.targetCacDelivered).toLocaleString("vi-VN")}đ.`,
      suggestedAction: "Giữ hoặc giảm ngân sách nhóm yếu; kiểm tra creative, tệp và tỷ lệ đơn giao trước khi scale.",
    });
  }

  if (input.minimumRoas && current.roas !== null && current.roas < input.minimumRoas) {
    recommendations.push({
      severity: "warning",
      code: "ROAS_BELOW_TARGET",
      title: "ROAS dưới mục tiêu",
      reason: `ROAS hiện tại ${current.roas.toFixed(2)}x, thấp hơn ngưỡng ${input.minimumRoas.toFixed(2)}x.`,
      suggestedAction: "Xếp hạng campaign/ad set theo lợi nhuận thực và chuyển ngân sách khỏi nhóm hiệu quả thấp.",
    });
  }

  if (input.minimumMer && current.mer !== null && current.mer < input.minimumMer) {
    recommendations.push({
      severity: "warning",
      code: "MER_BELOW_TARGET",
      title: "Hiệu suất marketing toàn mảng suy giảm",
      reason: `MER hiện tại ${current.mer.toFixed(2)}x, thấp hơn ngưỡng ${input.minimumMer.toFixed(2)}x.`,
      suggestedAction: "Kiểm tra cả Ads lẫn doanh thu organic/sàn; không kết luận chỉ từ ROAS attribution.",
    });
  }

  if (
    input.maximumReturnRate &&
    current.returnRate !== null &&
    current.returnRate > input.maximumReturnRate
  ) {
    recommendations.push({
      severity: "critical",
      code: "RETURN_RATE_OVER_TARGET",
      title: "Hoàn/hủy đang phá hiệu quả quảng cáo",
      reason: `Tỷ lệ hoàn/hủy ${(current.returnRate * 100).toFixed(1)}%, vượt ngưỡng ${(input.maximumReturnRate * 100).toFixed(1)}%.`,
      suggestedAction: "Không scale Ads cho tới khi xác định nguyên nhân từ sản phẩm, tư vấn, COD hoặc vận chuyển.",
    });
  }

  if (
    previous?.cacPerDeliveredOrder !== null &&
    previous?.cacPerDeliveredOrder !== undefined &&
    current.cacPerDeliveredOrder !== null &&
    current.cacPerDeliveredOrder > previous.cacPerDeliveredOrder * 1.15
  ) {
    recommendations.push({
      severity: "watch",
      code: "CAC_ACCELERATING",
      title: "CAC đang tăng nhanh",
      reason: "CAC đơn giao tăng trên 15% so với kỳ so sánh.",
      suggestedAction: "Chuẩn bị creative mới và kiểm tra CPM, CTR, conversion Page/đơn trước khi CAC vượt ceiling.",
    });
  }

  return recommendations;
}
