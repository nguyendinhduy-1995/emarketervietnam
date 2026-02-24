# Audit Commerce / Wallet Safety — Re-Audit sau Sprint 0–3

> **SHA**: `18ced1b` · **Ngày**: 2026-02-24

## 1. Wallet + Ledger ✅

### Schema
```
Wallet        → userId unique, balanceAvailable, creditBalance, currency, status
WalletLedger  → walletId, userId, type, amount, direction, refType, refId, idempotencyKey, note, metadata
```

**Luồng debit chuẩn** (credit-first):
1. Check `creditBalance` trước
2. Trừ credit nếu có, phần còn lại trừ `balanceAvailable`
3. Ghi `WalletLedger` entry với `idempotencyKey`

### ✅ Row Lock (Sprint 0)
- **File**: `src/app/api/hub/checkout/route.ts` lines 111-119
- **File**: `src/app/api/app/usage/charge/route.ts` lines 108-116
- `SELECT "id", "balanceAvailable", "creditBalance" FROM "Wallet" WHERE "id" = $1 FOR UPDATE`
- Re-check balance từ locked row trước khi debit
- **Trước Sprint 0**: dùng `Prisma.decrement` không lock → race condition

---

## 2. JWT Authentication ✅ (Sprint 0)

### Trước
5 commerce routes parse JWT bằng `Buffer.from(token.split('.')[1])` — **không verify signature**

### Sau
- **File**: `src/lib/auth/jwt.ts:83-100` — `getAnySession()` dùng `jose.jwtVerify`
- Tries `token` cookie (Hub) → `crm_token` cookie (CRM), cả 2 đều verified

| Route | Status |
|-------|--------|
| `api/hub/checkout/route.ts` | ✅ `getAnySession()` |
| `api/hub/orders/route.ts` | ✅ `getAnySession()` |
| `api/hub/downloads/route.ts` | ✅ `getAnySession()` |
| `api/hub/notifications/route.ts` | ✅ `getAnySession()` (cả GET + PATCH) |
| `api/app/usage/charge/route.ts` | ✅ `getAnySession()` |

---

## 3. Idempotency ✅

| Component | Key | File |
|-----------|-----|------|
| CommerceOrder | `idempotencyKey` | checkout/route.ts |
| WalletLedger | `idempotencyKey` | checkout + usage/charge |
| UsageEvent | `requestId` unique | usage/charge/route.ts |
| Subscription renewal | `sub_renew_{subId}_{YYYY-MM}` | cron/subscription-renew |

---

## 4. Price Snapshot ✅

- `OrderItem.priceSnapshot` (JSON) — captures price at checkout time
- `UsageEvent.unitPrice` — captures metered item price at charge time
- `MeteredItem` has `effectiveFrom`/`effectiveTo` for pricing versioning

---

## 5. Refund Flow ✅

- **File**: `src/app/api/emk-crm/refunds/route.ts`
- Atomic: reverse wallet debit + create refund record + revoke entitlements
- Uses `$transaction` for atomicity

---

## 6. Audit Trail ✅ (Sprint 3)

- **Model**: `AdminAuditLog` — `prisma/platform/schema.prisma` lines 1147-1166
- **Helper**: `src/lib/audit.ts` — `logAdminAction({ actor, action, resource, before, after })`
- 4 database indexes: `[actorUserId, createdAt]`, `[resource, resourceId]`, `[workspaceId, createdAt]`, `[action, createdAt]`
- Constants: `AuditAction.GRANT_ENTITLEMENT`, `REFUND`, `WALLET_ADJUST`, etc.
- **Status**: Infrastructure sẵn. ⚠️ Chưa wire vào commerce routes cụ thể (P2).

---

## 7. 3 Product Types — Commerce Flow

### A) CRM Subscription (billingModel = SUBSCRIPTION)
1. Khách mua trên Hub → `checkout/route.ts`
2. Trừ ví (row lock) → tạo `CommerceOrder` → `Entitlement` + `Subscription`
3. Auto-renew qua `cron/subscription-renew` → charge → extend hoặc PAST_DUE

### B) App PAYG (billingModel = PAYG)
1. App gọi `api/app/usage/charge` với `productId`, `meteredItemKey`, `requestId`
2. Check: JWT → idempotency → entitlement → quota → rate limit → wallet lock → debit
3. Return `chargeId` → app mới cho chạy feature
4. Ví dụ "Image Generator": unit=IMAGE, pricePerUnit=2000đ

### C) Digital Product (billingModel = ONE_TIME)
1. Khách mua trên Hub → `checkout/route.ts`
2. Trừ ví → tạo `DownloadGrant` → hiển thị ở `/hub/downloads`

---

## 8. Remaining Issues

| Issue | Priority | Fix |
|-------|----------|-----|
| Balance floor constraint (DB) | P2 | `ALTER TABLE "Wallet" ADD CONSTRAINT CHECK("balanceAvailable" >= 0)` |
| `logAdminAction()` chưa wire | P2 | Thêm vào checkout, refund, wallet adjust routes |
| Commerce tables thiếu workspaceId | P1 | Thêm cho CRM admin filtering |
