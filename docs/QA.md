# QA Manual Test Plan – eMarketer Hub Platform

> Cập nhật: 2026-02-23

## Cách chạy local

```bash
docker compose up -d          # Postgres + Redis
npm install
npm run setup                 # prisma:generate → push → seed
npm run dev                   # http://localhost:3000
```

**Super-admin:** `admin@emarketervietnam.vn` / `admin123`

---

## I. Landing & Form (6 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Home page loads | GET / | Hero section, features, CTAs, no Next.js default |
| 2 | LP Spa loads | GET /lp/spa | Scrollytelling, features, form visible |
| 3 | LP Bán hàng loads | GET /lp/ban-hang | Config-driven, industry pre-selected |
| 4 | LeadForm wizard step 1→2 | Fill name+phone → click Tiếp theo | Step 2: industry+size selectors |
| 5 | LeadForm honeypot | Fill hidden _hp field, submit | Returns error / silent reject |
| 6 | LeadForm submit success | Fill valid → submit | Redirect /thank-you?token=... |

## II. Hub Auth & Navigation (5 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 7 | Hub redirect when logged out | GET /hub without cookie | Redirect to /login |
| 8 | Login admin | POST /api/auth/login | Set cookie, redirect to /hub |
| 9 | Magic link flow | POST /api/auth/magic-link | Token in console, login via ?token= |
| 10 | Bottom nav mobile | Resize ≤768px, navigate | 3 tabs visible: Dashboard/Import/Settings |
| 11 | Theme toggle | Click theme icon in top bar | Cycles Auto→Light→Dark |

## III. Hub Features (5 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 12 | Dashboard empty state | Login fresh user, no workspaces | Empty CTA: "Tạo workspace →" |
| 13 | Onboarding wizard | /hub/onboarding → select industry → name → create | 3 steps, redirect to /hub |
| 14 | CSV import | /hub/import → upload .csv | Preview 5 rows, import button, success toast |
| 15 | Admin logs | /hub/admin/logs (as admin) | Event logs + error logs listed |
| 16 | Admin users | /hub/admin/users (as admin) | User list with roles, dates |

## IV. Theme System (4 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 17 | Auto dark (18-6) | Set mode Auto, check at 20:00 | html.dark class applied |
| 18 | Auto light (6-18) | Set mode Auto, check at 10:00 | html.dark removed |
| 19 | OS override in Auto | Set OS to dark, mode=Auto | Dark theme regardless of time |
| 20 | Manual persist | Set Dark, refresh page | Dark persists via localStorage |

## V. PWA & Offline (4 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 21 | Manifest loads | Check DevTools > Application > Manifest | Name, icon, start_url correct |
| 22 | SW registered | DevTools > Application > Service Workers | SW active |
| 23 | Offline page | Go offline, navigate to uncached route | /offline fallback shown |
| 24 | Install prompt | Open in Chrome mobile, wait | Install banner or A2HS option |

## VI. API Health (2 test cases)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 25 | Health check | GET /api/health | `{"ok":true}` |
| 26 | DB health | GET /api/health/db | `{"ok":true,"db":"connected"}` |

---

## Verification Commands

```bash
npx tsc --noEmit        # ✅ 0 errors
npm run build           # ✅ exit 0
npm run verify          # Runs lint+typecheck+build+e2e
```

## Seed & Reset Demo

```bash
npm run prisma:push     # Push schema
npm run prisma:seed     # Seed default admin + modules
```

## Deploy (Docker)

```bash
cp .env.example .env    # Edit secrets
docker compose up -d --build
```
