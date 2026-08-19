export type AIDepartment =
  | "executive"
  | "product"
  | "brand"
  | "growth"
  | "channels"
  | "crm"
  | "operations"
  | "finance"
  | "compliance"
  | "analytics";

export type AgentRiskLevel = "low" | "medium" | "high" | "critical";

export type ApprovalGate =
  | "spend_money"
  | "sign_contract"
  | "change_price"
  | "launch_campaign"
  | "scale_campaign"
  | "issue_refund"
  | "place_purchase_order"
  | "change_supplier"
  | "publish_sensitive_claim"
  | "move_cash"
  | "change_tax_or_legal_policy";

export interface AgentKpi {
  key: string;
  label: string;
  direction: "maximize" | "minimize" | "target";
  target?: number;
  unit?: "%" | "VND" | "count" | "days" | "ratio";
}

export interface AICompanyAgent {
  id: string;
  name: string;
  department: AIDepartment;
  mission: string;
  inputs: string[];
  outputs: string[];
  kpis: AgentKpi[];
  allowedActions: string[];
  approvalRequiredFor: ApprovalGate[];
  riskLevel: AgentRiskLevel;
}

export type CommercialDecision = "TEST" | "HOLD" | "SCALE" | "KILL" | "REVIEW";
export type HealthStatus = "HEALTHY" | "WATCH" | "WARNING" | "CRITICAL";

export interface CommercialSnapshot {
  revenue: number;
  productCost: number;
  adSpend: number;
  fulfillmentCost: number;
  platformFees: number;
  payrollAllocated: number;
  taxAllocated: number;
  refundsAndReturns: number;
  orders: number;
  deliveredOrders: number;
  repeatOrders?: number;
}

export interface CommercialEconomics {
  contributionProfit: number;
  contributionMargin: number;
  netOperatingProfit: number;
  netOperatingMargin: number;
  cacPerDeliveredOrder: number | null;
  refundReturnRate: number;
  repeatRate: number | null;
}

export interface AgentDecisionRecord {
  id: string;
  agentId: string;
  businessUnitId?: string;
  workflowId: string;
  decision: CommercialDecision;
  rationale: string;
  confidence: number;
  metrics?: Record<string, number | string | boolean | null>;
  requiresHumanApproval: boolean;
  createdAt: string;
}
