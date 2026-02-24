# eMarketer Hub SaaS v1

Nền tảng SaaS multi-tenant quản lý Spa & Salon. Khách hàng tự đăng ký và hệ thống tự provision CRM instance.

## Tech Stack

- **Next.js 16** (App Router) – UI + API routes
- **Prisma** – ORM (2 schemas: platform + spa)
- **PostgreSQL** – Database
- **Redis + BullMQ** – Job queue (provisioning, dunning)
- **JWT (jose)** – Authentication
- **AES-256-GCM** – AI key encryption

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Environment Variables
cp .env.example .env
# Required .env modifications:
# DATABASE_URL="postgresql://user:pass@localhost:5432/hub_platform"
# SPA_DATABASE_URL="postgresql://user:pass@localhost:5432/hub_spa"
# REDIS_URL="redis://localhost:6379"
# ENCRYPTION_KEY="32-byte-base64-string-here"
# JWT_SECRET="your-secure-jwt-secret-here"
# NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 3. Setup Database & Seed Default Data
npm run setup
# This runs: prisma:generate → prisma:push → prisma:seed

# 4. Start Dev Server
npm run dev

# 5. Start Background Workers (in a separate terminal)
npm run worker

# 6. Simulate Webhook Payment (Optional)
# To simulate a successful QR code transfer for order EMK-123456:
# curl -X POST http://localhost:3000/api/webhooks/dummybank \
#   -H "Content-Type: application/json" \
#   -d '{"txnRef": "TXN999", "amount": 500000, "description": "Payment for EMK-123456"}'
```

## Docker Deployment (Production)

The application is fully containerized and ready for VPS deployment using Docker Compose.

```bash
# 1. Clone the repository to your server
# 2. Copy and configure secrets
cp .env.example .env
# Edit .env: Set JWT_SECRET, ENCRYPTION_KEY, and SMTP settings. DB passwords can be set as DB_USER and DB_PASS.

# 3. Start the stack (Web, Worker, Postgres, Redis)
docker-compose up -d --build

# 4. Verify containers are running
docker-compose ps
```

## Architecture

```
Hub (emarketervietnam.vn)
├── Public Site: /, /products, /pricing, /signup, /login
├── Customer Portal: /dashboard, /workspaces, /apps, /marketplace, /billing, /users, /ai-vault, /help
├── Admin Panel: /admin/*
└── Spa CRM: /crm/{spaSlug}/*
```

**Single app, 4 areas** via route groups. Multi-tenant via `workspaceId` on all queries.

## Database

| Schema | Tables | Purpose |
|--------|--------|---------|
| platform | User, Org, Workspace, Membership, Subscription, Module, Entitlement, UpgradeOrder, PaymentTxn, AiProviderKey, etc. | Hub management |
| spa | Customer, Service, Appointment, Receipt, ReceiptItem | CRM business data |

## API Endpoints

### Auth
- `POST /api/auth/signup` – Create user + workspace + CRM
- `POST /api/auth/login` – Login with rate limiting
- `GET /api/auth/me` – Current session
- `DELETE /api/auth/me` – Logout

### Platform
- `GET /api/workspaces` – List workspaces
- `GET /api/apps` – List CRM instances
- `GET /api/modules` – Marketplace modules
- `GET /api/subscription` – Current subscription
- `POST /api/orders` – Create upgrade order
- `GET /api/orders/:id` – Order details + QR
- `POST /api/ai-keys` – Save encrypted AI key
- `POST /api/ai-keys/test` – Test AI connection
- `GET/POST /api/users` – Members & invites
- `GET /api/help` – Help docs

### Webhook
- `POST /api/webhooks/{provider}` – Bank payment webhook (idempotent)

### Admin
- `GET /api/admin/tenants` – Search tenants
- `POST /api/admin/tenants` – Actions (suspend/unsuspend/extend/reset)
- `POST /api/admin/orders/:id/confirm` – Manual order confirmation
- `POST /api/admin/provisioning/:workspaceId/retry` – Retry provisioning
- `GET/POST /api/admin/modules` – CRUD modules

### CRM (tenant-scoped)
- `CRUD /api/crm/{spaSlug}/customers`
- `CRUD /api/crm/{spaSlug}/services`
- `CRUD /api/crm/{spaSlug}/appointments`
- `CRUD /api/crm/{spaSlug}/receipts`
- `GET /api/crm/{spaSlug}/modules`
- `GET /api/crm/{spaSlug}/help`

## Flows

### Signup → CRM
1. `/signup` form → `POST /api/auth/signup`
2. Creates: User → Org → Workspace(slug) → Membership(OWNER) → Subscription(FREE) → ProductInstance(PENDING)
3. Enqueue `SEED_SPA` BullMQ job
4. Worker seeds spa_db with sample services
5. Set ProductInstance.status=ACTIVE
6. Redirect to `/crm/{slug}/onboarding`

### Billing → Module Activation
1. Marketplace → Create order → `POST /api/orders`
2. Order page shows QR + transfer content: `EMK-XXXXXX`
3. Bank webhook → `POST /api/webhooks/bank`
4. Match: amount + orderCode + idempotent txnRef
5. Auto: order=PAID → create entitlements → re-activate if PAST_DUE

### Dunning
- Daily worker scans expiring subscriptions
- T-7, T-3, T-1: Email reminders
- T+1: PAST_DUE (disable paid modules)
- T+3: SUSPENDED (read-only)
- On payment: re-activate immediately

## Default Admin

- Email: `admin@emarketervietnam.vn`
- Password: `admin123`
- ⚠️ Change in production!

## Assumptions

1. Path-based routing (`/crm/{slug}`) instead of subdomain for v1
2. Single Postgres instance, two schemas
3. Email v1: console log in dev, SMTP in production
4. QR generates bank transfer info (not VietQR API)
5. Webhook expects `{ txnRef, amount, description, paidAt }`

### Subdomain Routing Strategy
- The application uses Next.js Middleware to handle `crmspa.emarketervietnam.vn`.
- Ensure DNS is formatted properly: point an A or CNAME record for `crmspa` to your server.
