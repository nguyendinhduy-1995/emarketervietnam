# Billing & Dunning Operations

This document describes the financial lifecycle engine for the Hub PWA.

## 1. Upgrade Flow (QR Payment)
- **Trigger**: Tenant clicks "Nâng cấp" on the Hub dashboard.
- **Process**: 
  1. An `UpgradeOrder` is uniquely generated with an ID `EMK-XXXXXX`.
  2. The UI renders an instructions page or QR Code prompting the user to transfer the exact amount with the memo `EMK-XXXXXX`.
  3. The external Bank Provider webhook hits `/api/webhooks/[provider]`.
  4. The webhook parses the memo, finds the Order, validates the amount, drops idempotency duplicates (`txnRef`), updates the Order status, and extends the Workspace `Entitlement`.

## 2. Dunning Automation
A background worker (`src/workers/dunning.ts`) runs nightly via cron or scheduler.
- **T-7, T-3, T-1**: Sends warning emails/notifications (simulated logs) indicating expiration.
- **T+0 (Expired)**: Subscription status transitions to `PAST_DUE`. Premium modules are locked, but Core CRM functions remain.
- **T+3**: Subscription status transitions to `SUSPENDED`. The workspace gets locked (read-only mode).
- **Recovery**: If a webhook confirms payment for an active order, the script auto-transitions `PAST_DUE` -> `ACTIVE` and restores the Entitlements.
