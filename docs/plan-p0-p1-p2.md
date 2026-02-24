# P0 / P1 / P2 Backlog

> Tất cả items dựa trên kết quả audit thực tế (không phỏng đoán).  
> Estimate: **S** = ≤ 2h, **M** = 3-8h, **L** = 1-3 ngày

---

## P0 — Phải fix trước khi bán thật

### P0-1: Fix JWT verification trong Commerce routes
- **Scope**: 5 route files đang parse JWT thủ công `Buffer.from(token.split('.')[1])` — **KHÔNG verify signature**
- **Risk**: Attacker craft fake JWT → impersonate bất kỳ userId → trừ tiền/mua hàng
- **Files**:
  - `src/app/api/hub/checkout/route.ts:14-19`
  - `src/app/api/hub/orders/route.ts:7-15`
  - `src/app/api/hub/downloads/route.ts` (if same pattern)
  - `src/app/api/hub/notifications/route.ts` (if same pattern)
  - `src/app/api/app/usage/charge/route.ts:13-20`
- **Fix**: Đổi sang `getSession()` từ `src/lib/auth/jwt.ts` (đã dùng `jose.jwtVerify`)
- **Estimate**: **S**

### P0-2: Fix `resolveWorkspaceId()` — verify membership
- **Scope**: `src/lib/auth/middleware.ts:86-101`
- **Risk**: Client gửi `X-Workspace-Id` header tùy ý → truy cập workspace không phải của mình
- **Files**: `src/lib/auth/middleware.ts`
- **Fix**: Sau khi nhận `headerWsId`, verify `Membership.findUnique({ workspaceId, userId })`
- **Estimate**: **S**

### P0-3: Row lock cho Wallet debit
- **Scope**: `src/app/api/hub/checkout/route.ts:121-127`, `src/app/api/app/usage/charge/route.ts`
- **Risk**: Concurrent requests → balance < 0
- **Fix**: Dùng `$queryRaw('SELECT ... FROM "Wallet" WHERE id = $1 FOR UPDATE')` trước khi `decrement`
- **Estimate**: **S**

### P0-4: Tạo `requireEntitlement()` API middleware
- **Scope**: Tạo mới `src/lib/auth/entitlement-guard.ts`
- **Logic**: Check `Entitlement.findFirst({ workspaceId, moduleKey, status: 'ACTIVE', activeTo > now() })` → trả 403 nếu thiếu
- **Files cần gate** (13 routes): xem `docs/audit-entitlement.md` Section 4b
- **Estimate**: **M**

### P0-5: Tạo Feature Key enum registry
- **Scope**: Tạo mới `src/lib/features/registry.ts`
- **Content**: Enum/object 25 feature keys (xem `docs/feature-matrix.md`)
- **Estimate**: **S**

---

## P1 — Cần cho multi-tenant scale

### P1-1: Thêm `orgId`/`workspaceId` vào JWT token
- **Scope**: `src/lib/auth/jwt.ts` TokenPayload, login/signup routes
- **Files**:
  - `src/lib/auth/jwt.ts:6-11` — add `orgId`, `workspaceId` to TokenPayload
  - `src/app/api/auth/login/route.ts` — include in sign
  - `src/app/api/auth/signup/route.ts` — include in sign
  - `src/app/api/hub/signup/route.ts` — include in sign
- **Estimate**: **M**

### P1-2: Tenant resolution middleware
- **Scope**: `src/middleware.ts`
- **Logic**: Parse subdomain/slug → resolve `workspaceId` → inject `X-Workspace-Id` header
- **Estimate**: **M**

### P1-3: Add `workspaceId` / `orgId` to commerce tables
- **Scope**: Prisma schema migration
- **Tables**: Wallet, WalletLedger, Receipt, NotificationQueue, UsageQuota, RefundRecord, Coupon, DownloadGrant, Achievement
- **Files**: `prisma/platform/schema.prisma`
- **Estimate**: **L** (schema change + migration + update all queries)

### P1-4: Auto-filter `workspaceId` on all CRM queries
- **Scope**: All `/api/emk-crm/*` routes (21 files)
- **Logic**: Extract `workspaceId` from auth context → add `where: { workspaceId }` to all queries
- **Estimate**: **L**

### P1-5: Tạo UI gating hook `useEntitlement()`
- **Scope**: Tạo mới `src/hooks/useEntitlement.ts`
- **Logic**: Fetch `/api/hub/entitlements` → cache → expose `hasFeature(moduleKey)`, `getLimit(key)`
- **Estimate**: **M**

### P1-6: Tạo `<FeatureGate>` component
- **Scope**: Tạo mới `src/components/FeatureGate.tsx`
- **Logic**: Wrap menu items / pages, show upgrade prompt khi feature OFF
- **Estimate**: **S**

### P1-7: Apply UI gating to CRM sidebar + Hub pages
- **Scope**: `src/app/emk-crm/layout.tsx`, `src/app/hub/layout.tsx`
- **Logic**: Wrap add-on menu items with `<FeatureGate>`
- **Estimate**: **M**

### P1-8: Subscription auto-renewal cron
- **Scope**: Tạo mới cron/API route
- **Logic**: Check `currentPeriodEnd < now()` → charge wallet → extend period or suspend
- **Estimate**: **M**

### P1-9: Entitlement expiry cron
- **Scope**: Tạo mới cron/API route
- **Logic**: Check `activeTo < now() AND status = 'ACTIVE'` → set `status = 'INACTIVE'`
- **Estimate**: **S**

### P1-10: Admin audit log
- **Scope**: New model `AdminAuditLog` + middleware
- **Logic**: Log who changed what (entitlement, wallet, user, product) with before/after
- **Estimate**: **M**

---

## P2 — Nice-to-have / Scale readiness

### P2-1: Tách RBAC: Tenant Admin vs Platform Admin
- **Scope**: Redesign `emkRole` system, add `tenantRole` concept
- **Files**: `src/lib/auth/emk-guard.ts`, all CRM routes
- **Estimate**: **L**

### P2-2: Org lifecycle (ACTIVE → SUSPENDED → CANCELED)
- **Scope**: Add `status` to `Org` model, provisioning flow, cleanup
- **Estimate**: **M**

### P2-3: Job/Worker entitlement gating
- **Scope**: Drip campaign sender, reminder scheduler
- **Logic**: Check entitlement before executing job
- **Estimate**: **M**

### P2-4: Entitlement cache layer (Redis/in-memory)
- **Scope**: Cache entitlements per workspace, TTL 5min, invalidate on change
- **Estimate**: **M**

### P2-5: Multi-workspace user switching
- **Scope**: UI workspace selector, JWT refresh on switch
- **Estimate**: **M**

### P2-6: Database-level RLS (Row Level Security)
- **Scope**: PostgreSQL RLS policies per workspace
- **Risk mitigation**: Prevents cross-tenant leak even if app code has bugs
- **Estimate**: **L**

### P2-7: Webhook notifications for entitlement changes
- **Scope**: Notify external apps when entitlement granted/revoked
- **Estimate**: **S**

### P2-8: Usage dashboard for PAYG products
- **Scope**: UI showing usage history, quota remaining, spend forecasting
- **Estimate**: **M**

### P2-9: Balance floor DB constraint
- **Scope**: PostgreSQL CHECK constraint `balanceAvailable >= 0`
- **Estimate**: **S**

---

## Summary

| Priority | Items | Total Estimate |
|----------|-------|---------------|
| **P0** | 5 items | ~2-3 days |
| **P1** | 10 items | ~8-12 days |
| **P2** | 9 items | ~6-10 days |

> **Khuyến nghị**: Fix P0 ngay (1-2 sprint). P1 song song build tenant isolation. P2 theo roadmap.
