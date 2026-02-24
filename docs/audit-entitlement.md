# Audit: Entitlement & Feature-flag Add-on

## 1. Entitlement Model (schema.prisma:221-245)

```prisma
model Entitlement {
  id              String    @id @default(cuid())
  workspaceId     String              // ✅ tenant-scoped
  userId          String?             // ✅ user-scoped option
  productId       String?             // ✅ links to product
  moduleKey       String              // ✅ feature key
  scope           String    @default("ORG")    // ORG | USER | TENANT
  status          String    @default("ACTIVE") // ACTIVE | INACTIVE | REVOKED
  precedenceLevel Int       @default(0)        // ✅ higher wins
  featureFlags    Json?               // ✅ {"automation": true}
  limits          Json?               // ✅ {"maxUsers": 10}
  activeFrom      DateTime
  activeTo        DateTime?           // ✅ expiry
  revokedAt       DateTime?           // ✅ revoke
  revokeReason    String?             // ✅ audit trail
}
```

**Verdict**: Schema ĐẠT — model đầy đủ fields cần thiết.

## 2. Source of Truth

| Question | Answer |
|----------|--------|
| Lưu ở đâu? | DB nội bộ (`platformDb.entitlement`) |
| Hub API là source? | ❌ Checkout tạo trực tiếp, không qua Hub API |
| Cache? | ❌ Không có cache layer (mỗi lần check = query DB) |
| Refresh/expire? | ❌ Không có cron/scheduler check `activeTo` |
| Revoke? | ✅ Partial — checkout refund revoke, nhưng không có admin UI |

## 3. Nơi Entitlement Được Kiểm Tra (3/∞)

| Nơi check | File | Logic |
|-----------|------|-------|
| PAYG Usage | `api/app/usage/charge/route.ts:35` | `db.entitlement.findFirst({ where: { userId, productId, status: 'ACTIVE' } })` |
| Public Booking | `api/public/book/[spaSlug]/route.ts:28` | `db.entitlement.findFirst({ where: { workspaceId, moduleKey: 'ONLINE_BOOKING', status: 'ACTIVE' } })` |
| CRM Account Detail | `api/emk-crm/accounts/[id]/route.ts:18` | Read-only: hiển thị entitlements trong account health |

## 4. Gating 3 lớp — CHƯA CÓ

### 4a. UI Gating: ❌ 0%

- Không có hook `useEntitlement()` hoặc `useFeatureFlag()`
- Không có component `<FeatureGate>` hoặc `<PlanGate>`
- Menu sidebar hiển thị toàn bộ (CRM + Hub) bất kể entitlement
- Cần gate: Automation menu, AI features, Analytics advanced, drip campaigns, digital assets

### 4b. API Gating Middleware: ❌ 0%

- Không có `requireEntitlement(moduleKey)` middleware
- Không có interceptor/middleware tự động check trước route handler
- Các route nên gate nhưng **KHÔNG** gate:

| Route | ModuleKey cần gate | File |
|-------|-------------------|------|
| AI Chat | `AI_ASSISTANT` | `api/ai/chat/route.ts` |
| AI Analytics | `AI_ANALYTICS` | `api/ai/analytics/route.ts` |
| AI Lead Score | `AI_LEAD_SCORE` | `api/ai/lead-score/route.ts` |
| AI Summary | `AI_SUMMARY` | `api/ai/summary/route.ts` |
| AI Churn | `AI_CHURN` | `api/ai/churn/route.ts` |
| AI Generate | `AI_GENERATE` | `api/ai/generate/route.ts` |
| AI Settings | `AI_SETTINGS` | `api/ai/settings/route.ts` |
| Automation | `AUTOMATION` | `api/emk-crm/automation/route.ts` |
| Drip Campaign | `DRIP_CAMPAIGN` | `api/emk-crm/drip/route.ts` |
| Messaging (SMS/Zalo) | `MESSAGING` | `api/emk-crm/messaging/route.ts` |
| Export | `DATA_EXPORT` | `api/emk-crm/export/route.ts` |
| CMS | `CMS` | `api/emk-crm/cms/route.ts` |
| Digital Assets | `DIGITAL_ASSETS` | `api/emk-crm/digital-assets/route.ts` |

### 4c. Job/Worker Gating: ❌ 0%

- `EmkDripCampaign` scheduler: không check entitlement trước khi gửi
- `ReminderRule` scheduler: không check
- Không có worker/cron system hiện tại

## 5. Feature Key Registry: ❌ CHƯA CÓ

Không có file constants/enum chuẩn hoá. Entitlement `moduleKey` được hardcode cục bộ:
- `ONLINE_BOOKING` (public booking)
- Product `key` (checkout — dùng product key làm moduleKey)

**Cần tạo**: file `src/lib/features/registry.ts` với enum Feature Keys thống nhất.

## 6. Kiến nghị

1. **Tạo `requireEntitlement()` middleware** — check `moduleKey + workspaceId + status=ACTIVE + activeTo > now()`
2. **Tạo `useEntitlement()` React hook** — fetch entitlements 1 lần, cache, dùng cho UI gating
3. **Tạo `<FeatureGate moduleKey="...">` component** — bọc menu/page
4. **Tạo Feature Key enum** — map tất cả moduleKey → product → price
5. **Thêm cron job** kiểm tra `activeTo` expired → auto set `status = 'INACTIVE'`
