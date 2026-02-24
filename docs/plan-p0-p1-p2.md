# P0/P1/P2 Backlog — Cập nhật sau Sprint 0–3

> **SHA**: `18ced1b` · **Ngày**: 2026-02-24

## ✅ P0 Đã Fix (Sprint 0)

| # | Item | Commit | File |
|---|------|--------|------|
| 1 | JWT verify 5 commerce routes | `4004c55` | `jwt.ts`, 5 route files |
| 2 | resolveWorkspaceId verify membership | `4004c55` | `middleware.ts:87-108` |
| 3 | Wallet row lock (SELECT FOR UPDATE) | `4004c55` | `checkout`, `usage/charge` |
| 4 | Feature Key registry | `5ad0233` | `lib/features/registry.ts` |
| 5 | requireEntitlement() middleware | `5ad0233` | `lib/auth/entitlement-guard.ts` |

---

## Backlog còn lại

### P1 — Scale Readiness (trước khi bán multi-tenant thật)

| # | Item | Scope | Files | Estimate |
|---|------|-------|-------|----------|
| 1 | **CRM routes tenant filter** | Thêm `where: { workspaceId }` cho 21 routes | `api/emk-crm/*` | **L** (2-3 ngày) |
| 2 | **Apply requireEntitlement** | Wire middleware vào 13 add-on routes | `api/emk-crm/automation,messaging,...` | **M** (1 ngày) |
| 3 | **CRM sidebar UI gating** | Wrap menu items với `<IfFeature>` | CRM layout component | **S** (0.5 ngày) |
| 4 | **Commerce tables add workspaceId** | Schema migration + backfill | 5 tables: CommerceOrder, Receipt, etc. | **M** (1 ngày) |
| 5 | **Middleware tenant injection** | Subdomain → X-Workspace-Id auto | `src/middleware.ts` | **S** (0.5 ngày) |
| 6 | **Tenant provisioning API** | Tạo Org → Workspace → Admin → Slug | New route + helper | **M** (1 ngày) |
| 7 | **requireTenantAdmin guard** | Tách tenant admin vs platform admin | `emk-guard.ts` | **S** (0.5 ngày) |

### P2 — Nice-to-have (không block bán)

| # | Item | Scope | Estimate |
|---|------|-------|----------|
| 1 | Balance floor constraint | `ALTER TABLE ADD CONSTRAINT` | **S** |
| 2 | Wire `logAdminAction()` | Thêm vào checkout, refund, wallet routes | **S** |
| 3 | Job/worker entitlement gating | Automation cron check entitlement | **S** |
| 4 | Entitlement caching layer | Redis/in-memory cache cho `checkEntitlement` | **M** |
| 5 | Multi-workspace switching UI | User chọn workspace khi có nhiều | **M** |
| 6 | Usage dashboard cho PAYG | CRM page hiển thị usage theo ngày/khách | **M** |
| 7 | PostgreSQL RLS | Row-level security for deep isolation | **L** |
| 8 | Webhook notifications | Notify external systems on entitlement changes | **M** |

---

## Timeline ước tính

| Phase | Duration | Goal |
|-------|----------|------|
| P1 sprint | 5-7 ngày | CRM routes tenant-safe + entitlement wired |
| P2 sprint | 3-5 ngày | Polish + monitoring + caching |
| **Total remaining** | **~2 tuần** | Production-ready SaaS |
