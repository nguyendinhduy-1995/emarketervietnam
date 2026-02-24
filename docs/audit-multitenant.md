# Audit: Multi-tenant Readiness

## 1. Tenant Hierarchy (Schema)

```
User ──1:N──▶ Membership ──N:1──▶ Workspace ──N:1──▶ Org
                                      │
                        ┌─────────────┼─────────────┐
                   Entitlement   Subscription   ProductInstance
```

| Model | `workspaceId` / `orgId`? | File | Line |
|-------|--------------------------|------|------|
| Workspace | ✅ `orgId` | schema.prisma | 75 |
| Membership | ✅ `workspaceId` | schema.prisma | 103 |
| Entitlement | ✅ `workspaceId` | schema.prisma | 223 |
| Subscription | ✅ `workspaceId` | schema.prisma | 271 |
| EventLog | ✅ `workspaceId` (optional) | schema.prisma | 119 |
| ErrorLog | ✅ `workspaceId` (optional) | schema.prisma | 133 |
| ImportJob | ✅ `workspaceId` | schema.prisma | 148 |
| **CommerceOrder** | ⚠️ `orgId` optional, **no wsId** | schema.prisma | 483 |
| **Wallet** | ❌ only `userId` | schema.prisma | 920 |
| **WalletLedger** | ❌ only `userId` | schema.prisma | 937 |
| **Receipt** | ❌ only `userId` | schema.prisma | 681 |
| **NotificationQueue** | ❌ only `userId` | schema.prisma | 699 |
| **UsageEvent** | ⚠️ `orgId` optional | schema.prisma | 524 |
| **UsageQuota** | ❌ only `userId` | schema.prisma | 661 |
| **RefundRecord** | ❌ only `userId` | schema.prisma | 600 |
| **EmkLead** | ⚠️ `workspaceId` optional | schema.prisma | 749 |
| **EmkAccount** | ✅ `workspaceId` | schema.prisma | 765 |
| **EmkTask** | ❌ no tenantId | schema.prisma | 782 |
| **EmkNote** | ❌ no tenantId | schema.prisma | 803 |
| **SupportTicket** | ⚠️ `workspaceId` optional | schema.prisma | 1015 |
| **CmsPost** | ❌ global | schema.prisma | 997 |
| **Coupon** | ❌ global | schema.prisma | 620 |
| **DownloadGrant** | ❌ only `userId` | schema.prisma | 560 |
| **Achievement** | ❌ only `userId` | schema.prisma | 1098 |
| **AffiliateAccount** | ❌ global | schema.prisma | 821 |

## 2. Tenant Resolution

### 2.1 Middleware (`src/middleware.ts`)

```
CSRF check → Rate limit → Subdomain rewrite (crmspa.* → /crm/*)
```

**Không có**: tenant resolution, inject `X-Workspace-Id` header, session binding

### 2.2 JWT Token (`src/lib/auth/jwt.ts:6-11`)

```typescript
export interface TokenPayload extends JWTPayload {
    userId: string;
    email: string;
    name: string;
    isAdmin?: boolean;
    // ❌ THIẾU: orgId, workspaceId, emkRole
}
```

### 2.3 Auth Guards

| Guard | File | Tenant-scoped? | Used in routes? |
|-------|------|---------------|----------------|
| `requireAuth()` | `src/lib/auth/middleware.ts:26` | ❌ No | Some Hub routes |
| `requireWorkspaceRole()` | `src/lib/auth/middleware.ts:39` | ✅ Yes, checks membership | **❌ 0 routes** |
| `requireAdmin()` | `src/lib/auth/middleware.ts:70` | ❌ Global | Not used |
| `requireEmkRole()` | `src/lib/auth/emk-guard.ts:9` | ❌ Global eMarketer staff | **All 30+ CRM routes** |
| `resolveWorkspaceId()` | `src/lib/auth/middleware.ts:86` | ⚠️ Header or first membership | 5 Hub routes |

## 3. Cross-tenant Leak Risks (P0)

### 3.1 CRM Routes — ALL global queries

Toàn bộ route `/api/emk-crm/*` dùng `requireEmkRole()` nhưng query **không bind tenant**:

| Route | File | Query pattern | Risk |
|-------|------|--------------|------|
| Accounts list | `api/emk-crm/accounts/route.ts` | `db.emkAccount.findMany({})` | All accounts visible |
| Wallets list | `api/emk-crm/wallets/route.ts` | `db.wallet.findMany({})` | All wallets visible |
| Orders list | `api/emk-crm/orders/route.ts` | `db.commerceOrder.findMany({})` | All orders visible |
| Refunds list | `api/emk-crm/refunds/route.ts` | `db.refundRecord.findMany({})` | All refunds visible |
| Reconciliation | `api/emk-crm/reconciliation/route.ts` | `db.walletLedger.aggregate({})` | All ledger data |
| Export | `api/emk-crm/export/route.ts` | `db.emkLead.findMany({})` | All leads export |
| Coupons | `api/emk-crm/coupons/route.ts` | `db.coupon.findMany({})` | All coupons |
| Topups | `api/emk-crm/topups/route.ts` | `db.topupIntent.findMany({})` | All topup history |

> **Lưu ý**: Hiện tại CRM routes là **internal ops** dùng bởi team eMarketer (không phải "tenant admin panel"). Nếu giữ kiểu này thì ít risk hơn, nhưng khi scale multi-tenant thì P0.

### 3.2 Hub Routes — User scoped nhưng có thể leak

| Route | File | Issue |
|-------|------|-------|
| Hub Orders | `api/hub/orders/route.ts` | Parse JWT thủ công `Buffer.from(sessionToken.split('.')[1])` — bypass `verifyToken()` |
| Hub Checkout | `api/hub/checkout/route.ts` | Same manual JWT parse |
| PAYG Usage | `api/app/usage/charge/route.ts` | Same manual JWT parse |
| Hub Downloads | `api/hub/downloads/route.ts` | Same manual JWT parse |
| Hub Notifications | `api/hub/notifications/route.ts` | Same manual JWT parse |

> **Risk**: Manual `Buffer.from(JWT)` parse **không verify signature** → bất kỳ ai craft JWT giả đều có thể impersonate userId.

### 3.3 `resolveWorkspaceId()` fallback

```typescript
// src/lib/auth/middleware.ts:86-101
export async function resolveWorkspaceId(req, user) {
    const headerWsId = req.headers.get('x-workspace-id');
    if (headerWsId) return headerWsId; // ❌ KHÔNG verify membership
    
    const membership = await platformDb.membership.findFirst({
        where: { userId: user.userId },
        orderBy: { createdAt: 'asc' },
    });
    return membership?.workspaceId ?? null;
}
```

**Risk**: Client gửi bất kỳ `X-Workspace-Id` → truy cập workspace không phải của mình.

## 4. Provisioning Status

| Feature | Status | Notes |
|---------|--------|-------|
| Create tenant flow | ✅ Partial | `ProvisioningJob` + `ProductInstance` models exist |
| Workspace status | ✅ | `ACTIVE \| SUSPENDED` |
| Org lifecycle | ❌ | Không có `status`, không có cancel/expire |
| Admin user seeding | ❌ | Không có auto-create admin cho tenant mới |
| Subdomain/slug | ✅ | `Workspace.slug` unique |
| EmkAccount status | ✅ | `TRIAL \| ACTIVE \| PAST_DUE \| CHURNED` |

## 5. RBAC по tenant

| Item | Status |
|------|--------|
| User → Workspace membership | ✅ `Membership(workspaceId, userId, role)` |
| Roles | ✅ `OWNER \| ADMIN \| STAFF` |
| Platform super-admin | ✅ `User.isAdmin` |
| eMarketer staff roles | ✅ `User.emkRole`: ADMIN/OPS/SALES/CS |
| Tenant admin vs global admin | ❌ Chưa tách — CRM routes dùng `emkRole` (global) |
| `requireWorkspaceRole` enforcement | ❌ Không dùng trong bất kỳ route nào |
