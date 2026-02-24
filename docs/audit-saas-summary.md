# SaaS Audit Summary

> **Audit date**: 2026-02-24  
> **Repo**: emarketervietnam.vn  
> **Auditor**: Antigravity AI Agent  
> **Schema**: 1 144 dòng Prisma, 40+ model  
> **API routes**: 82 route files  

---

## Kết luận tổng

| Mục | Trạng thái | Điểm |
|-----|-----------|------|
| **Multi-tenant readiness** | ⚠️ **CHƯA ĐẠT** | 3/10 |
| **Entitlement / Feature-flag add-on** | ⚠️ **CHƯA ĐẠT** | 2/10 |
| **Commerce / Wallet safety** | ✅ **ĐẠT CƠ BẢN** | 7/10 |

---

## Lý do ngắn gọn

### Multi-tenant: 3/10 — CHƯA ĐẠT

- **Có**: `Org → Workspace → Membership` hierarchy, `requireWorkspaceRole()` helper, `resolveWorkspaceId()` helper
- **Thiếu nghiêm trọng**:
  - Không có middleware bắt buộc tenant context (subdomain/path → tenantId)
  - JWT token **không chứa** `orgId` / `workspaceId`
  - `requireWorkspaceRole()` **không được gọi** trong bất kỳ route nào
  - `resolveWorkspaceId()` chỉ dùng ở 5/82 route (timeline, billing, team, subscription, today)
  - **Toàn bộ CRM routes** (`/api/emk-crm/*`) query global, không bind tenant
  - Commerce tables (`CommerceOrder`, `Wallet`, `WalletLedger`, `Receipt`, `NotificationQueue`) chỉ có `userId`, không có `orgId`/`workspaceId`
  - Không có provisioning lifecycle (ACTIVE → SUSPENDED → CANCELED)

### Entitlement: 2/10 — CHƯA ĐẠT

- **Có**: `Entitlement` model với `featureFlags`, `limits`, `precedenceLevel`, `revokedAt`
- **Thiếu nghiêm trọng**:
  - **UI gating**: 0% — không có component/hook nào check feature flag
  - **API gating middleware**: 0% — không có `requireEntitlement()` middleware
  - **Job/worker gating**: 0% — automation/drip/scheduler không check entitlement
  - Entitlement chỉ được kiểm tra ở **3 nơi**: checkout, PAYG usage, public booking
  - Không có feature key registry / Feature Matrix chuẩn hoá
  - Không có cache/refresh/expire mechanism

### Commerce: 7/10 — ĐẠT CƠ BẢN

- **Có**: Wallet + WalletLedger (không update balance trực tiếp), `idempotencyKey` unique, `priceSnapshot`, `$transaction` atomic, credit-first debit, `RefundRecord`, `Receipt`, `Coupon`
- **Thiếu**:
  - `decrement` thay vì `SELECT FOR UPDATE` row lock → race condition dưới load cao
  - Checkout parse JWT thủ công (`Buffer.from(...).toString()`) thay vì dùng `verifyToken()`
  - Không có audit log cho thay đổi quyền (entitlement revoke/grant chỉ ghi trong order)

---

> Chi tiết xem: [audit-multitenant.md](./audit-multitenant.md), [audit-entitlement.md](./audit-entitlement.md), [audit-commerce.md](./audit-commerce.md), [feature-matrix.md](./feature-matrix.md), [plan-p0-p1-p2.md](./plan-p0-p1-p2.md)
