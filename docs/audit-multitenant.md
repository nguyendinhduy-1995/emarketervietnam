# Audit Multi-tenant — Re-Audit sau Sprint 0–3

> **SHA**: `18ced1b` · **Ngày**: 2026-02-24

## 1. Tenant Hierarchy

```
Org (status: ACTIVE|SUSPENDED|CANCELED)
 └── Workspace (slug unique, status: ACTIVE|SUSPENDED)
      └── Membership (userId, role: ADMIN|MEMBER|VIEWER)
```

**Schema**: `prisma/platform/schema.prisma` lines 63–100

### ✅ Đạt
- Org → Workspace → Membership hierarchy rõ ràng
- `Workspace.slug` unique (dùng cho subdomain routing)
- `Org.status` có 3 trạng thái lifecycle (Sprint 2)

---

## 2. Tenant Resolution

### ✅ JWT mang tenant (Sprint 2)
- **File**: `src/lib/auth/jwt.ts:6-14`
- `TokenPayload` = `{ userId, email, name, isAdmin, orgId, workspaceId, emkRole }`
- **File**: `src/app/api/auth/login/route.ts:45-60,88-96`
- Login (cả magic-link + password) fetch `Membership.findFirst` → inject `orgId`, `workspaceId` vào JWT

### ✅ resolveWorkspaceId verify membership (Sprint 0)
- **File**: `src/lib/auth/middleware.ts:87-108`
- `X-Workspace-Id` header → verify `Membership.findUnique({ workspaceId, userId })` trước khi chấp nhận
- Fallback: first membership by createdAt

### ⚠️ Middleware subdomain — chưa inject
- **File**: `src/middleware.ts:67-86`
- Subdomain `crmspa.*` rewrite `/crm/*` nhưng **chưa inject X-Workspace-Id** từ subdomain
- Impact: CRM routes phải manual resolve workspace

---

## 3. Data Isolation — Check từng bảng

### Bảng CÓ workspaceId/orgId ✅
| Model | Field | File | Line |
|-------|-------|------|------|
| Workspace | id (IS tenant) | schema.prisma | 74 |
| Membership | workspaceId | schema.prisma | 97 |
| Entitlement | workspaceId | schema.prisma | 220 |
| Subscription | workspaceId | schema.prisma | 272 |
| EventLog | workspaceId | schema.prisma | 117 |
| ErrorLog | workspaceId | schema.prisma | 129 |
| ProductInstance | workspaceId | schema.prisma | 139 |
| AdminAuditLog | workspaceId | schema.prisma | 1155 |
| EmkAccount | workspaceId | schema.prisma | — |

### Bảng THIẾU workspaceId ⚠️ (P1 migration cần)
| Model | Risk | Fix |
|-------|------|-----|
| CommerceOrder | Query global theo userId OK, nhưng CRM admin thấy tất cả tenant | Thêm `workspaceId` |
| Receipt | Same risk | Thêm `workspaceId` |
| NotificationQueue | Same risk | Thêm `workspaceId` |
| UsageQuota | Same risk | Thêm `workspaceId` |
| RefundRecord | Same risk | Thêm `workspaceId` |
| Wallet | userId unique — tự isolate | OK for now |
| WalletLedger | userId FK — tự isolate | OK for now |

---

## 4. CRM Route — Cross-tenant Risk

### ⚠️ 21 CRM routes dùng `requireEmkRole()` global
**Guard file**: `src/lib/auth/emk-guard.ts`
- `requireEmkRole()` check `emkRole` (ADMIN/OPS/SALES/CS) nhưng **không scope workspaceId**
- Nghĩa là: staff có quyền thấy TẤT CẢ tenant data

**Routes không scope tenant** (tất cả `/api/emk-crm/*`):
| Route | Risk |
|-------|------|
| `emk-crm/wallets/route.ts` | Xem ví mọi khách |
| `emk-crm/orders/route.ts` | Xem đơn hàng mọi tenant |
| `emk-crm/payouts/route.ts` | Payouts mọi affiliate |
| `emk-crm/refunds/route.ts` | Refunds mọi tenant |
| `emk-crm/bank-accounts/route.ts` | Bank accounts mọi tenant |
| `emk-crm/export/route.ts` | Export data toàn hệ thống |
| `emk-crm/leads/route.ts` | Leads mọi tenant |
| `emk-crm/tasks/route.ts` | Tasks mọi tenant |
| `emk-crm/automation/route.ts` | Chạy automation global |
| `emk-crm/messaging/route.ts` | Gửi tin nhắn cho bất kỳ ai |
| ... và thêm ~10 routes khác | |

> **Lưu giải**: Hiện tại CRM routes là nội bộ eMarketer staff — thiết kế ban đầu là single-tenant ops. Khi bán SaaS multi-tenant, phải thêm `where: { workspaceId }` cho tất cả queries.

---

## 5. RBAC

### ✅ Đã có
- `User.emkRole`: ADMIN, OPS, SALES, CS (platform-level)
- `Membership.role`: ADMIN, MEMBER, VIEWER (workspace-level)
- `requireWorkspaceRole()` helper (chưa used nhiều)
- `requireEmkRole()` guard cho CRM routes
- `requireAdmin()` guard cho platform admin

### ⚠️ Chưa có
- Tách `requireTenantAdmin(workspaceId)` vs `requirePlatformAdmin()`
- Multi-workspace switching (user có nhiều workspace)

---

## 6. Provisioning

### ✅ Schema sẵn
- `ProvisioningJob` model tồn tại
- `Org.status` lifecycle: ACTIVE → SUSPENDED → CANCELED

### ⚠️ Chưa có flow
- Chưa có API tạo tenant mới (seed config, tạo admin user, set slug)
- Chưa có suspension/cancellation workflow
