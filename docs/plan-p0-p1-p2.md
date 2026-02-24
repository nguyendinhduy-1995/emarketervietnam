# P0/P1/P2 Backlog — ALL DONE

> **SHA**: `247786e` · **Ngày**: 2026-02-24

## ✅ ALL P0 Items Done

| # | Item | Commit |
|---|------|--------|
| 1 | JWT verify 5 commerce routes | `4004c55` |
| 2 | resolveWorkspaceId verify membership | `4004c55` |
| 3 | Wallet row lock (SELECT FOR UPDATE) | `4004c55` |
| 4 | Feature Key registry (25 keys) | `5ad0233` |
| 5 | requireEntitlement() middleware | `5ad0233` |

## ✅ ALL P1 Items Done

| # | Item | Commit |
|---|------|--------|
| 1 | 28 CRM routes → requireCrmAuth (tenant-scoped) | `247786e` |
| 2 | requireEntitlement wired into crm-middleware | `247786e` |
| 3 | Commerce tables + workspaceId (5 tables) | `247786e` |
| 4 | Middleware tenant injection (subdomain → slug) | `247786e` |
| 5 | Tenant provisioning API | `247786e` |
| 6 | requireTenantAdmin + requirePlatformAdmin guards | `247786e` |
| 7 | JWT enhanced (orgId, workspaceId, emkRole) | `110d1b5` |

## ✅ ALL P2 Items Done

| # | Item | Commit |
|---|------|--------|
| 1 | AdminAuditLog model + logAdminAction() | `dea68ed` |
| 2 | CRM middleware auto-audit (ctx.audit) | `247786e` |
| 3 | Entitlement cache (60s TTL + invalidation) | `247786e` |
| 4 | Usage dashboard API (PAYG analytics) | `247786e` |
| 5 | Webhook for entitlement changes | `247786e` |
| 6 | Entitlement expiry cron | `dea68ed` |
| 7 | Subscription renewal cron (wallet lock) | `dea68ed` |
| 8 | Org lifecycle status (ACTIVE/SUSPENDED/CANCELED) | `110d1b5` |

---

## Commit History

| SHA | Description | Files |
|-----|-------------|-------|
| `4004c55` | Sprint 0: P0 Security Hotfix | 7 files |
| `5ad0233` | Sprint 1: Entitlement Gating | 5 files |
| `110d1b5` | Sprint 2: Multi-tenant Foundation | 3 files |
| `dea68ed` | Sprint 3: Cron Jobs + Audit Trail | 4 files |
| `247786e` | 10/10 Push: Full SaaS Readiness | 34 files |
