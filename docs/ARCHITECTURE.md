# Hub SaaS CRM Architecture

## System Overview
Hub SaaS CRM is a multi-tenant B2B2C customer relationship management platform tailored for Spas and Salons. It consists of a centralized Hub (Platform) and isolated Tenant instances (Spas).

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL (Prisma ORM)
  - `platform_db`: Manages tenants, billing, and global users.
  - `spa_db`: Manages tenant-specific operational data (Customers, Appointments, etc.).
- **Styling**: Tailwind CSS + Custom CSS Variables for Theming
- **Background Jobs**: BullMQ + Redis for async tasks (Provisioning, Reminders, Dunning).
- **Authentication**: JWT stored in HttpOnly Cookies.

## Core Paradigms
1. **Multi-Tenancy Isolation**: Every table in `spa_db` has a `workspaceId`. All API routes require `x-workspace-id` or derive it from the `spaSlug` subdomain, implicitly injecting `workspaceId` into every Prisma query.
2. **Event-Driven Pipelines**: 
   - Organization Signup → API (`/api/auth/signup`) → Database Insert → Enqueue `ProvisioningJob` → Background Worker execution.
   - Billing Webhook → Database Match → Entitlement Grant → Action Log.
3. **Responsive Design**: Mobile-first philosophy with Bottom Navigation on CRM screens.

## Directory Structure
- `src/app`: Next.js App Router (Public, CRM, Admin, API).
- `src/lib`: Core utilities (Auth, DB, Queue, Tenant resolution).
- `src/workers`: Background worker entry points.
- `prisma`: Schema definitions.
- `tests`: Playwright E2E tests.
