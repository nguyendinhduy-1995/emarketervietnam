# Audit Entitlement — Re-Audit sau Sprint 0–3

> **SHA**: `18ced1b` · **Ngày**: 2026-02-24

## 1. Entitlement Model ✅

**File**: `prisma/platform/schema.prisma` lines 218-247

```prisma
model Entitlement {
  id              String   @id @default(cuid())
  workspaceId     String   // ← tenant scoped ✅
  userId          String?
  moduleKey       String   // ← maps to FeatureKey registry
  productId       String?
  scope           String   @default("WORKSPACE")
  status          String   @default("ACTIVE")
  featureFlags    Json?
  limits          Json?
  precedenceLevel Int      @default(0)
  activeFrom      DateTime @default(now())
  activeTo        DateTime?
  revokedAt       DateTime?
  grantedBy       String?
  grantSource     String?
}
```

**Source of truth**: DB nội bộ (`platformDb.entitlement`)

---

## 2. Feature Key Registry ✅ (Sprint 1)

**File**: `src/lib/features/registry.ts`

| Category | Keys | Count |
|----------|------|-------|
| Core (always on) | CORE_DASHBOARD, CORE_LEADS, CORE_TASKS, CORE_BILLING, CORE_MARKETPLACE, CORE_TEAM, CORE_SUPPORT | 7 |
| AI Add-ons | AI_ASSISTANT, AI_ANALYTICS, AI_LEAD_SCORE, AI_CHURN, AI_GENERATE, AI_SUMMARY, AI_SETTINGS | 7 |
| Automation | AUTOMATION, DRIP_CAMPAIGN | 2 |
| Communication | MESSAGING, EMAIL_TEMPLATES | 2 |
| Data & Content | DATA_EXPORT, ONLINE_BOOKING, CMS, DIGITAL_ASSETS | 4 |
| Commerce | AFFILIATES, KNOWLEDGE_BASE, FINANCE_ADMIN | 3 |
| **Total** | | **25** |

Includes: `FEATURE_TIER` (Core/Add-on/Admin), `FEATURE_DEPS` (dependency graph), `FEATURE_LABELS` (Vietnamese)

---

## 3. Gating — 3 Lớp

### Lớp 1: API Gating ✅ (Infrastructure sẵn)

**File**: `src/lib/auth/entitlement-guard.ts`

```typescript
// Guard: returns 403 + upgrade URL
requireEntitlement(workspaceId, FeatureKey.AUTOMATION)
// → { error: "Tính năng chưa kích hoạt", code: "FEATURE_DISABLED", upgradeUrl: "/hub/marketplace" }

// Check-only (no response)
checkEntitlement(workspaceId, moduleKey)
// → { allowed: boolean, entitlement?: ... }

// Batch: get all entitlements for UI
getWorkspaceEntitlements(workspaceId)
```

**Status**: ✅ Infrastructure sẵn. ⚠️ Chưa wire vào CRM routes cụ thể (CRM routes hiện là platform admin internal, không phải tenant-facing).

### Lớp 2: UI Gating ✅ (Infrastructure sẵn)

**File**: `src/hooks/useEntitlement.tsx`
```typescript
const { hasFeature, getLimit, getFlag } = useEntitlement();
hasFeature('AUTOMATION') // → boolean
getLimit('AUTOMATION', 'maxRules') // → number | null
```

**File**: `src/components/FeatureGate.tsx`
```tsx
<FeatureGate feature="AUTOMATION">
  <AutomationPanel />
</FeatureGate>

<IfFeature feature="MESSAGING">
  <MessagingMenuItem />
</IfFeature>
```

**API**: `GET /api/hub/entitlements` — returns feature map per workspace

**Status**: ✅ Components sẵn. ⚠️ CRM sidebar chưa wrap (deferred to UI sprint).

### Lớp 3: Job/Worker Gating ⚠️ (Chưa implement)

- `api/cron/subscription-renew` và `api/cron/entitlement-expire`: system-level, không cần gate
- Automation routes (`api/emk-crm/automation`): chưa check entitlement trước khi chạy rules
- **Fix**: thêm `requireEntitlement(ws, FeatureKey.AUTOMATION)` ở đầu handler

---

## 4. Expire & Revoke ✅ (Sprint 3)

**Entitlement Expire Cron**: `src/app/api/cron/entitlement-expire/route.ts`
- Query: `WHERE status = 'ACTIVE' AND activeTo < now()`
- Action: set `INACTIVE` + log `EventLog`
- Protected by `CRON_SECRET` header

**Subscription Renewal Cron**: `src/app/api/cron/subscription-renew/route.ts`
- Charge wallet (row lock) → extend period
- Or PAST_DUE + notify if insufficient balance

---

## 5. Nơi cần apply gating (P1)

| Route | FeatureKey | Layer |
|-------|-----------|-------|
| `emk-crm/automation/route.ts` | AUTOMATION | API |
| `emk-crm/messaging/route.ts` | MESSAGING | API |
| `emk-crm/templates/route.ts` | EMAIL_TEMPLATES | API |
| `emk-crm/export/route.ts` | DATA_EXPORT | API |
| `emk-crm/digital-assets/route.ts` | DIGITAL_ASSETS | API |
| `emk-crm/categories/route.ts` (CMS) | CMS | API |
| AI routes (7) | AI_* | API |
| CRM sidebar | All add-on features | UI |
