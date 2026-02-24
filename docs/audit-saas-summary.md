# Audit SaaS Summary — Re-Audit sau Sprint 0–3

> **Ngày**: 2026-02-24 · **Repo**: emarketervietnam.vn · **SHA**: `18ced1b`

## Mô tả hệ thống

### Hub (Customer Portal / Marketplace + Wallet)
- Nơi khách hàng đăng ký/đăng nhập, nạp Ví, xem số dư, lịch sử trừ tiền, hóa đơn/đơn hàng.
- Nơi mua/thuê sản phẩm (CRM subscription, App PAYG, sản phẩm số one-time) + mua add-on (entitlement/feature).
- Nơi Affiliate/Agent: link giới thiệu, tracking referral, hoa hồng, rút/đối soát.

### CRM (Ops/Admin Portal)
- Nơi Admin + team vận hành: quản lý khách hàng/leads, team, phân quyền, hỗ trợ ticket.
- Nơi Admin quản trị kinh doanh: doanh số, wallet/ledger, subscription, đối soát/refund, coupon.
- **CRM không phải nơi khách mua** — mua/thuê nằm ở Hub.

---

## Verdict

| Mục | Score trước | Score sau Sprint 0–3 | Verdict |
|-----|-----------|---------------------|---------|
| **Multi-tenant readiness** | 3/10 ⚠️ | **7/10** | ĐẠT CƠ BẢN ✅ |
| **Entitlement / Feature-flag add-on** | 2/10 ⚠️ | **8/10** | ĐẠT ✅ |
| **Commerce / Wallet safety** | 7/10 ✅ | **9/10** | ĐẠT TỐT ✅ |

---

## Multi-tenant (7/10 — ĐẠT CƠ BẢN)

### ✅ Đã fix (Sprint 0–2)
| Item | File | Chi tiết |
|------|------|----------|
| JWT mang tenant | `src/lib/auth/jwt.ts:6-14` | `TokenPayload` có `orgId`, `workspaceId`, `emkRole` |
| Login inject tenant | `src/app/api/auth/login/route.ts:45-60,88-96` | Cả magic-link lẫn password đều fetch membership |
| Workspace verify | `src/lib/auth/middleware.ts:87-108` | `resolveWorkspaceId()` verify `Membership.findUnique` |
| Org lifecycle | `prisma/platform/schema.prisma:67` | `Org.status` = ACTIVE/SUSPENDED/CANCELED |

### ⚠️ Còn thiếu (P1 — chưa block bán)
| Item | File | Ước tính |
|------|------|----------|
| CRM routes query global | 21 routes `/api/emk-crm/*` | Chưa có `where: { workspaceId }` |
| Middleware tenant injection | `src/middleware.ts` | Subdomain → X-Workspace-Id chưa tự inject |
| RBAC tenant vs platform | `src/lib/auth/emk-guard.ts` | Chưa tách `requireTenantAdmin` |

---

## Entitlement (8/10 — ĐẠT)

### ✅ Đã có (Sprint 1)
| Item | File |
|------|------|
| Feature Key registry (25 keys) | `src/lib/features/registry.ts` |
| API guard `requireEntitlement()` | `src/lib/auth/entitlement-guard.ts` |
| UI hook `useEntitlement()` | `src/hooks/useEntitlement.tsx` |
| UI component `<FeatureGate>` + `<IfFeature>` | `src/components/FeatureGate.tsx` |
| Entitlements API `/api/hub/entitlements` | `src/app/api/hub/entitlements/route.ts` |
| Entitlement expiry cron | `src/app/api/cron/entitlement-expire/route.ts` |

### ⚠️ Còn thiếu (P1)
- CRM sidebar chưa wrap `<IfFeature>` (deferred — CRM routes là internal ops)
- Job/worker chưa gate entitlement (automation cron chưa check `requireEntitlement`)
- `requireEntitlement()` chưa apply vào routes cụ thể (infrastructure sẵn, chưa wire)

---

## Commerce (9/10 — ĐẠT TỐT)

### ✅ Đã fix (Sprint 0+3)
| Item | File |
|------|------|
| JWT verify (jose) trong 5 commerce routes | `checkout`, `orders`, `downloads`, `notifications`, `usage/charge` |
| Wallet row lock (SELECT FOR UPDATE) | `checkout/route.ts`, `usage/charge/route.ts` |
| Subscription renewal cron (wallet lock + receipt) | `api/cron/subscription-renew/route.ts` |
| AdminAuditLog model + `logAdminAction()` | `prisma/schema.prisma`, `src/lib/audit.ts` |

### ⚠️ Còn thiếu (P2)
- Balance floor constraint (`CHECK balanceAvailable >= 0`)
- `logAdminAction()` chưa wire vào commerce routes cụ thể

---

> **Kết luận**: Sau Sprint 0–3, repo đã đủ cơ sở hạ tầng để bán SaaS. Rủi ro P0 (JWT, wallet, workspace) đã được fix. Việc còn lại chủ yếu là CRM route hardening (P1) và UI gating (P1).
