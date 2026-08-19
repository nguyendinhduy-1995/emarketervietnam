import { CommercialEconomics, CommercialSnapshot } from "./types";

export function calculateCommercialEconomics(
  snapshot: CommercialSnapshot,
): CommercialEconomics {
  const revenueAfterReturns = snapshot.revenue - snapshot.refundsAndReturns;
  const contributionProfit =
    revenueAfterReturns -
    snapshot.productCost -
    snapshot.adSpend -
    snapshot.fulfillmentCost -
    snapshot.platformFees;

  const netOperatingProfit =
    contributionProfit - snapshot.payrollAllocated - snapshot.taxAllocated;

  const deliveredOrders = Math.max(snapshot.deliveredOrders, 0);
  const orders = Math.max(snapshot.orders, 0);

  return {
    contributionProfit,
    contributionMargin:
      revenueAfterReturns > 0 ? contributionProfit / revenueAfterReturns : 0,
    netOperatingProfit,
    netOperatingMargin:
      revenueAfterReturns > 0 ? netOperatingProfit / revenueAfterReturns : 0,
    cacPerDeliveredOrder:
      deliveredOrders > 0 ? snapshot.adSpend / deliveredOrders : null,
    refundReturnRate:
      snapshot.revenue > 0 ? snapshot.refundsAndReturns / snapshot.revenue : 0,
    repeatRate:
      snapshot.repeatOrders != null && orders > 0
        ? snapshot.repeatOrders / orders
        : null,
  };
}
