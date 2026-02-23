# Product Requirements Document (PRD): eMarketer Hub SaaS v1

## 1. Overview
eMarketer Hub is a multi-tenant SaaS platform designed to help Spa & Salon businesses manage their daily operations. The v1 MVP focuses on core CRM functionalities (customers, appointments, services, and receipts) while providing a robust platform foundation (authentication, billing, provisioning, and marketplace).

## 2. Target Audience
- Spa and Salon owners/managers.
- Staff members (receptionists, technicians).
- System administrators (internal eMarketer Hub staff).

## 3. Core Capabilities

### 3.1. Hub Platform (Tenant Management)
- **Self-Service Onboarding:** Users can sign up, create an organization, and provision a new Spa CRM instance in one seamless flow.
- **Tenant Isolation:** Data is strictly isolated per tenant via `workspaceId`.
- **Marketplace & Billing:** Users can view available modules, upgrade their plan via QR code payment, and receive automatic entitlements via bank webhooks.
- **Subscription Management:** Automated Dunning system handles subscription renewals, sending reminders and toggling features based on payment status.
- **AI Vault (BYOK):** Secure storage of third-party AI provider keys using AES-256-GCM encryption.

### 3.2. Spa CRM Application
- **Customer Management:** Track customer profiles, contact info, and history.
- **Service Menu:** Define and categorize services with duration and pricing.
- **Appointment Booking:** Manage calendar appointments, track statuses (Scheduled, Confirmed, In Progress, Completed, Cancelled).
- **Billing & Receipts:** Generate receipts for services rendered, tracking total, paid, and remaining balances.
- **Onboarding Checklist:** Built-in guide to help new tenants configure their instance.

### 3.3. Admin Panel
- **Tenant Oversight:** View all workspaces, manage access (suspend/unsuspend), and extend trials.
- **Billing Operations:** Manually reconcile and confirm payments that failed automatic webhook processing.
- **Provisioning Ops:** Retry failed provisioning jobs.
- **Module Management:** CRUD operations for marketplace modules and pricing.

## 4. Architecture & Tech Stack

### 4.1. Technology
- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL (Single instance)
- **ORM:** Prisma (Two schemas: `platform_db` and `spa_db`)
- **Queue/Workers:** Redis + BullMQ (Provisioning & Dunning)
- **Authentication:** Custom JWT-based solution using `jose` and `bcryptjs`.
- **Styling:** Vanilla CSS with a dark premium glassmorphism theme.

### 4.2. Database Design
- **Platform Schema:** `User`, `Org`, `Workspace`, `Membership`, `ProductInstance`, `ProvisioningJob`, `Module`, `Entitlement`, `Plan`, `Subscription`, `UpgradeOrder`, `PaymentTxn`, `HelpDoc`, `AiProviderKey`.
- **Spa Schema:** `Customer`, `Service`, `Appointment`, `Receipt`, `ReceiptItem`. (All tables explicitly require a `workspaceId`).

### 4.3. Routing Strategy
The application uses Next.js Route Groups to manage different access domains within a single accessible application:
- `(public)`: Marketing, Pricing, Signup, Login.
- `(portal)`: Authenticated user dashboard, marketplace, and billing.
- `(admin)`: Internal eMarketer tracking.
- `crm/[spaSlug]`: Spa-specific CRM functionalities via path-based routing.

## 5. Future Roadmap (v2 & Beyond)
- **Subdomain Routing:** Move from path-based `/crm/{slug}` to subdomain routing `crmspa.emarketervietnam.vn/{slug}` via NGINX.
- **Advanced Modules:** Expand marketplace with Inventory Management, Payroll/Commissions, SMS Integration, and AI Assistants.
- **Patient/Client Portal:** Allow spa customers to book appointments online directly.
- **Mobile App:** React Native based mobile application for spa staff.

### V2.4 Assumptions & Notes (Implemented by Dev)
- **Subdomain Routing:** We use Next.js `middleware.ts` to intercept `crmspa.emarketervietnam.vn` and `crmspa.localhost` hostnames, seamlessly rewriting `/{slug}/...` to `/crm/{slug}/...`. This implements the PRD spec without duplicating the app or needing complex DNS wildcard changes beyond a single A record for `crmspa`.
- **Dunning Worker:** Implemented as a BullMQ repeatable job (`cron: 0 0 * * *`) that checks `Subscription` records daily.
