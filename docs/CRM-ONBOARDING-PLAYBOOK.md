# 📋 CRM Product Onboarding Playbook

> Hướng dẫn từng bước để **nhập một sản phẩm CRM mới** vào pipeline Hub.
> Áp dụng cho mọi sản phẩm CRM bán qua eMarketer Hub.

---

## 1. Chuẩn bị sản phẩm

### 1.1 Checklist bắt buộc trước khi nhập

| # | Yêu cầu | Mô tả |
|---|---------|-------|
| ✅ | **Docker image** | Image đã build, push lên registry (GHCR/private) |
| ✅ | **Health endpoint** | `GET /api/health` trả `200` |
| ✅ | **Prisma schema** | Có migration hoặc `db push` chạy được |
| ✅ | **Admin seed script** | Script tạo admin user đầu tiên (email + password) |
| ✅ | **Entitlement SDK** | CRM biết fetch + verify Ed25519 signed snapshot |
| ✅ | **Feature gate** | Mỗi feature có `if (entitlement.features[KEY].enabled)` guard |
| ✅ | **ENV template** | Danh sách env vars CRM cần (DB, JWT, HUB_API, etc.) |

### 1.2 Thông tin cần thu thập

```typescript
{
  productKey: "CRM_SPA_PRO",       // Unique, UPPER_SNAKE_CASE
  name: "CRM Spa Pro",
  slug: "crm-spa-pro",             // URL-safe, lowercase
  type: "CRM",
  billingModel: "SUBSCRIPTION",
  deliveryMethod: "PROVISION_TENANT",
  
  // Pricing
  priceMonthly: 499000,            // VND/tháng
  priceYearly: 4990000,            // VND/năm (~17% tiết kiệm)
  
  // Deploy config
  imageRef: "ghcr.io/org/crm-spa:v1.0.0",
  releaseVersion: "v1.0.0",
  demoUrl: "https://crm-spa.emarketervietnam.vn",
  
  // Plan options
  planOptions: [
    { key: "MONTHLY", label: "Hàng tháng", price: 499000, cycle: "MONTHLY" },
    { key: "YEARLY",  label: "Hàng năm",  price: 4990000, cycle: "YEARLY", discount: "17%" },
  ],
  
  // Addons — mỗi addon = 1 entitlement riêng
  addons: [
    { featureKey: "AI_ASSISTANT",  label: "AI Trợ lý",       price: 99000,  trialDays: 7,  billing: "SUBSCRIPTION" },
    { featureKey: "AUTOMATION",    label: "Tự động hóa",     price: 149000, trialDays: 7,  billing: "SUBSCRIPTION" },
    { featureKey: "DRIP_CAMPAIGN", label: "Drip Campaign",   price: 199000, trialDays: 0,  billing: "SUBSCRIPTION", requires: ["AUTOMATION"] },
    { featureKey: "MESSAGING",     label: "Nhắn tin",        price: 0,      trialDays: 0,  billing: "PAYG" },
    { featureKey: "DATA_EXPORT",   label: "Xuất dữ liệu",   price: 49000,  trialDays: 7,  billing: "SUBSCRIPTION" },
  ],
  
  // Content
  tagline: "Quản lý khách hàng chuyên nghiệp",
  outcomeText: "Tăng 30% doanh thu nhờ quản lý khách hàng tốt hơn",
  features: [
    { text: "Quản lý khách hàng", included: true },
    { text: "Đặt lịch hẹn", included: true },
    { text: "Báo cáo nâng cao", included: true },
  ],
  faq: [
    { q: "Dùng thử bao lâu?", a: "7 ngày cho add-on, CRM core không giới hạn." },
  ],
}
```

---

## 2. Nhập sản phẩm vào Hub

### 2.1 Seed qua API

```bash
# Gọi seed API (cần ADMIN_SECRET)
curl -X POST https://hub.emarketervietnam.vn/api/hub/seed-products \
  -H "Authorization: Bearer $ADMIN_SECRET" \
  -H "Content-Type: application/json"
```

Hoặc thêm vào file `src/app/api/hub/seed-products/route.ts`:

```typescript
await db.product.upsert({
  where: { key: 'CRM_SPA_PRO' },
  update: { /* fields */ },
  create: { /* all fields from checklist above */ },
});
```

### 2.2 Verify trong DB

```sql
SELECT key, name, "imageRef", "planOptions", addons 
FROM "Product" WHERE key = 'CRM_SPA_PRO';
```

---

## 3. Chuẩn bị Demo Instance

### 3.1 Deploy demo

```bash
# 1. Docker
docker pull ghcr.io/org/crm-spa:v1.0.0
docker run -d --name demo-crm-spa \
  -e DEMO_MODE=true \
  -e DATABASE_URL=postgresql://... \
  -p 3001:3000 \
  ghcr.io/org/crm-spa:v1.0.0

# 2. Nginx
server {
    listen 80;
    server_name crm-spa.emarketervietnam.vn;
    location / { proxy_pass http://127.0.0.1:3001; }
}

# 3. SSL
certbot certonly --nginx -d crm-spa.emarketervietnam.vn
```

### 3.2 Demo guardrails

ENV phải có:
```
DEMO_MODE=true
```

File `src/lib/demo-mode.ts` sẽ tự:
- Giới hạn AI: 5 lượt/session, 10/ngày
- Block xóa hàng loạt, export full DB
- CTA "Mua & Triển khai" floating banner (component `DemoCTA.tsx`)

### 3.3 Cron reset data demo

```bash
# Daily cron
0 3 * * * curl -X POST https://hub.emarketervietnam.vn/api/cron/demo-reset \
  -H "Authorization: Bearer $CRON_SECRET"
```

---

## 4. Flow khi khách mua

```
1. Khách vào demo → dùng thử
2. Bấm CTA → redirect Hub marketplace
3. Chọn plan (Monthly/Yearly) + addon (checkbox)
4. Nhập domain + tên DN + email admin
5. Thanh toán bằng ví Hub
6. Order: PAID_WAITING_DOMAIN_VERIFY
7. Setup page hiện DNS instructions (TXT + A)
8. Khách trỏ DNS → bấm "Xác minh"
9. Hub check DNS (TXT + A lookup) → DOMAIN_VERIFIED
10. Deployer: pull image → DB → .env → compose → migrate → seed → nginx → SSL
11. Callback → DELIVERED_ACTIVE
12. Khách nhận CRM URL + credentials
13. CRM fetch entitlement snapshot (Ed25519 signed, 10-min TTL)
```

---

## 5. Entitlement — Quy tắc TUYỆT ĐỐI

> [!CAUTION]
> CRM **KHÔNG BAO GIỜ** lưu `addonEnabled=true` trong DB local.

| Quy tắc | Chi tiết |
|---------|----------|
| **Ký bằng Ed25519** | Hub ký private key, instance chỉ giữ public key |
| **5-field binding** | workspaceId + instanceId + boundDomain + productKey + expiresAt |
| **TTL 10 phút** | Revalidate mỗi 5 phút |
| **Grace 24h** | Chỉ khi Hub unreachable, dùng cache cũ |
| **Feature gate** | Mỗi feature check `snapshot.features[KEY].enabled` |
| **Verify FAIL** | → Khóa tất cả add-on, chỉ giữ CORE |
| **Domain mismatch** | → Khóa toàn bộ |
| **SUSPENDED** | → Non-core features disabled |

### Code mẫu verify trong CRM:

```typescript
import { verifySnapshot, verifyBinding } from '@/lib/entitlement-signing';

const { snapshot, signature, algo } = await fetch(HUB_API + '/api/hub/entitlements/snapshot?...');

// 1. Verify signature
if (algo === 'ed25519') {
  if (!verifySnapshot(snapshot, signature)) { lockAllAddons(); return; }
}

// 2. Verify binding
const bind = verifyBinding(snapshot, {
  workspaceId: process.env.WORKSPACE_ID,
  instanceId: process.env.INSTANCE_ID,
  domain: process.env.DOMAIN,
  productKey: process.env.PRODUCT_KEY,
});
if (!bind.valid) { lockAllAddons(); return; }

// 3. Feature gate
if (snapshot.features.AI_ASSISTANT?.enabled) { /* show AI */ }
```

---

## 6. Deploy instance — Convention

```
/opt/emk/instances/<workspaceId>/<productKey>/
├── docker-compose.yml
├── .env
├── .deployed          ← orderId (idempotency)
├── deploy.log
├── uploads/
└── logs/
```

**Deployer script**: `scripts/deploy-instance.sh <payload.json>`
- **flock** per workspace (no race)
- **Rollback** on failure (cleanup container, DB, nginx)
- **Idempotency** via .deployed file

---

## 7. Kill Switch

```bash
# Suspend
curl -X POST https://hub.emarketervietnam.vn/api/hub/admin/suspend-instance \
  -H "Content-Type: application/json" \
  -H "Cookie: session=<admin_cookie>" \
  -d '{"workspaceId":"...","reason":"Chưa thanh toán","action":"SUSPEND"}'

# Reactivate
curl -X POST ... -d '{"workspaceId":"...","reason":"Đã thanh toán","action":"REACTIVATE"}'
```

Hiệu lực: ≤10 phút (next entitlement revalidation).

---

## 8. Nhập sản phẩm CRM mới — Checklist nhanh

- [ ] Build Docker image + push registry
- [ ] Thêm product vào seed API (copy template trên, đổi key/name/pricing/addons)
- [ ] Gọi seed API
- [ ] Deploy demo instance (DEMO_MODE=true)
- [ ] Verify addon picker hiển thị đúng trên marketplace
- [ ] Test full flow: checkout → DNS → deploy → login
- [ ] Set ENTITLEMENT_PUBLIC_KEY trong instance .env
- [ ] Verify feature gate hoạt động với snapshot
