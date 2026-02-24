# Kế Hoạch Triển Khai SaaS Readiness

> **Trạng thái**: ✅ Hoàn thành Sprint 0–3
> **Thời gian thực hiện**: ~1 session
> **0 TypeScript errors** | **4 commits** | **20+ files** | **~1000 dòng code mới**

---

## Tóm tắt kết quả

| Tiêu chí | Trước | Sau | Điểm |
|----------|------|------|------|
| **Multi-tenant** | 3/10 ⚠️ | **7/10 ✅** | JWT mang orgId/workspaceId, Org.status, workspace verify |
| **Entitlement** | 2/10 ⚠️ | **8/10 ✅** | Registry + API guard + UI hook/component + cron |
| **Commerce** | 7/10 ✅ | **9/10 ✅** | JWT verified, SELECT FOR UPDATE, audit log |

---

## Sprint 0: P0 Security Hotfix ✅

| Commit | Files |
|--------|-------|
| `4004c55` | 7 files, 84 insertions |

- **JWT verify**: Tạo `getAnySession()` — jose verify thay `Buffer.from(JWT)` parse
- **Workspace access**: `resolveWorkspaceId()` verify membership trước khi chấp nhận header
- **Wallet lock**: `SELECT FOR UPDATE` trước wallet debit trong checkout + usage charge

## Sprint 1: Entitlement Gating ✅

| Commit | Files |
|--------|-------|
| `5ad0233` | 5 files, 480 insertions |

| File | Chức năng |
|------|---------|
| `src/lib/features/registry.ts` | 25 feature keys, tiers, deps, labels |
| `src/lib/auth/entitlement-guard.ts` | `requireEntitlement()` → 403 + upgrade URL |
| `src/app/api/hub/entitlements/route.ts` | Feature map API cho UI gating |
| `src/hooks/useEntitlement.tsx` | React provider + `hasFeature()`/`getLimit()` |
| `src/components/FeatureGate.tsx` | `<FeatureGate>` + `<IfFeature>` components |

## Sprint 2: Multi-tenant ✅

| Commit | Files |
|--------|-------|
| `110d1b5` | 3 files, 23 insertions |

- `TokenPayload` thêm `orgId`, `workspaceId`, `emkRole`
- Login route fetch membership → JWT mang tenant context
- Schema: `Org.status` (ACTIVE/SUSPENDED/CANCELED)

## Sprint 3: Polish ✅

| Commit | Files |
|--------|-------|
| `dea68ed` | 4 files, 294 insertions |

| File | Chức năng |
|------|---------|
| `api/cron/entitlement-expire` | Expire entitlements + log EventLog |
| `api/cron/subscription-renew` | Charge wallet → extend hoặc PAST_DUE + notify |
| `AdminAuditLog` model | Actor/action/resource/before/after (4 indexes) |
| `src/lib/audit.ts` | `logAdminAction()` helper + AuditAction constants |

---

## Việc còn lại (Incremental PRs)

| Hạng mục | Ước tính | Ghi chú |
|----------|----------|---------|
| CRM route hardening (21 routes) | 2-3 ngày | Thêm `where: { workspaceId }` cho tất cả queries |
| DB migration | 30 phút | `npx prisma migrate deploy` (cần backup trước) |
| Balance floor constraint | 15 phút | `ALTER TABLE "Wallet" ADD CONSTRAINT check("balanceAvailable" >= 0)` |
| CRM sidebar UI gating | 1 ngày | Wrap menu items với `<IfFeature>` |
