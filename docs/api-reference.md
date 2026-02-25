# eMarketer Hub — API Reference

## Authentication
All authenticated endpoints require a JWT cookie (`emk_token`).
Admin endpoints require `user.role === 'ADMIN'`.
Cron endpoints require `x-cron-secret` header or `?secret=` query param.

---

## Hub APIs

### Entitlements

#### `GET /api/hub/entitlements/snapshot`
Returns HMAC-signed entitlement snapshot for the authenticated user.
```json
{ "userId": "...", "entitlements": [...], "timestamp": "...", "expiresAt": "...", "signature": "..." }
```

#### `POST /api/hub/entitlements/verify`
Verify signature of an entitlement snapshot.
```json
// Request
{ "snapshot": { ... }, "signature": "..." }
// Response
{ "valid": true, "entitlements": [...] }
```

---

### PAYG Usage

#### `POST /api/hub/usage/quote`
Get price quote for a metered item.
```json
// Request
{ "productId": "...", "itemKey": "ai_generate", "quantity": 1 }
// Response
{ "unitPrice": 5000, "total": 5000, "balance": 100000, "quota": { "used": 5, "limit": 100 } }
```

#### `POST /api/hub/usage/charge`
Charge wallet (HOLD) and get usage token.
```json
// Request
{ "productId": "...", "itemKey": "...", "quantity": 1, "idempotencyKey": "unique-key" }
// Response
{ "usageToken": "jwt...", "eventId": "...", "charged": 5000 }
```

#### `POST /api/hub/usage/complete`
Report job completion — capture or refund.
```json
// Request
{ "eventId": "...", "usageToken": "jwt...", "status": "SUCCESS", "resultMeta": {} }
// Response
{ "ok": true, "finalStatus": "SUCCEEDED" }
```

#### `GET /api/hub/usage/history`
Get usage history and active quotas.
```json
{ "events": [...], "quotas": [...] }
```

---

### SSO Launch

#### `POST /api/hub/launch`
Generate SSO launch URL for an app.
```json
// Request
{ "workspaceId": "...", "productId": "..." }
// Response
{ "launchUrl": "https://app.example.com/sso?token=jwt...", "expiresIn": 60 }
```

#### `POST /api/hub/launch/verify`
App verifies launch token → gets user + entitlements.
```json
// Request (from App)
{ "token": "jwt..." }
// Response
{ "userId": "...", "workspaceId": "...", "entitlements": [...] }
```

---

### DNS & Deploy (CRM Rental)

#### `POST /api/hub/dns/init`
Initialize DNS verification for a custom domain.
```json
// Request
{ "domain": "crm.company.vn" }
// Response
{ "verificationId": "...", "txtRecord": "_emk-verify.crm.company.vn", "txtValue": "emk-verify-xxx" }
```

#### `POST /api/hub/dns/verify`
Verify DNS TXT record.
```json
// Request
{ "verificationId": "..." }
// Response
{ "verified": true, "status": "VERIFIED" }
```

#### `POST /api/hub/deploy/enqueue`
Deploy CRM instance after DNS verification.
```json
// Request
{ "workspaceId": "...", "domain": "crm.company.vn" }
// Response
{ "instanceId": "...", "status": "DEPLOYING" }
```

#### `POST /api/hub/deploy/callback`
Deployer reports deployment result. Requires `x-deploy-secret`.
```json
// Request
{ "instanceId": "...", "status": "SUCCESS", "crmUrl": "https://crm.company.vn", "containerId": "..." }
```

---

### Checkout & Orders

#### `POST /api/hub/checkout`
Purchase a product (subscription, one-time, CRM).
```json
// Request
{ "productId": "...", "billingCycle": "MONTHLY", "couponCode": "..." }
// Response
{ "orderId": "...", "total": 199000, "status": "PAID" }
```

---

### Webhooks

#### `POST /api/webhooks/entitlement`
Internal webhook for entitlement lifecycle events. Requires `x-webhook-secret`.
```json
// Request
{ "type": "REVOKE|SUSPEND|REACTIVATE", "workspaceId": "...", "reason": "..." }
```

---

### Admin

#### `GET /api/hub/admin/stats` (Admin only)
Platform overview: users, revenue, subscriptions, CRM instances.

#### `GET /api/hub/admin/deploying-instances` (Deploy secret)
List instances pending deployment.

---

### Dashboard & System

#### `GET /api/hub/today`
Dashboard summary: workspaces, subscription, wallet, alerts, CRM.

#### `GET /api/health`
Health check: DB connectivity, memory, env vars. Returns 200 or 503.

---

### Cron Endpoints

| Endpoint | Schedule | Function |
|---------|----------|----------|
| `POST /api/cron/subscription-renew` | Daily 6AM | Auto-renew subscriptions |
| `POST /api/cron/dns-check` | Every 15min | Verify pending DNS records |
| `POST /api/cron/process-notifications` | Every 5min | Send pending email notifications |
| `POST /api/cron/process-all` | Every 5min | Run all cron tasks |

---

### Rate Limits

| Endpoint | Limit | Window |
|---------|-------|--------|
| `/api/auth/signup` | 50 | 15 min |
| `/api/auth/login` | 20 | 15 min |
| `/api/hub/usage/charge` | 10 | 1 min |
| `/api/hub/dns/init` | 5 | 1 min |
| `/api/hub/deploy/enqueue` | 3 | 1 min |
| `/api/hub/checkout` | 10 | 1 min |
| `/api/hub/launch` | 20 | 1 min |
