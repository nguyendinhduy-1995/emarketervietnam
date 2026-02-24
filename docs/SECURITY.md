# Hub SaaS CRM Security Guidelines

## Multi-Tenant Data Isolation
- **Rule of Thumb**: EVERY query to `spaDb` MUST include `where: { workspaceId: ... }`. Failure to do so leads to data leakage across tenants.
- **Middleware Guard**: `src/middleware.ts` intercepts requests, checking for CSRF attacks and enforcing API rate limits on core endpoints.

## Authentication & Authorization
- **JWT**: Stateless JWT approach. Tokens are signed using `process.env.JWT_SECRET` and stored in secure, HttpOnly, SameSite=Lax cookies.
- **RBAC**: Users have roles mapping to `workspaceId` via the `Membership` table (OWNER, ADMIN, STAFF).
- **Admin**: The platform `User` table has an `isAdmin` flag for global Hub operations.

## Encryption at Rest
- **AI Keys (`AiProviderKey`)**: API keys belonging to users are encrypted at rest using an AES-256-GCM symmetric encryption algorithm in `src/lib/auth/encryption.ts` before saving to the DB. They are only decrypted in memory just-in-time when making the downstream API call to OpenAI/Claude.

## API Hardening
- **Rate Limiting**: An in-memory token bucket limits repetitive signup and booking abuses.
- **CSRF**: Next.js Server Actions inherently protect against CSRF. Legacy API routes `/api/...` validate the `Origin` header against the expected Host.
- **Idempotency**: Webhook endpoints enforce uniqueness constraints via `txnRef`, protecting against duplicated payment events.
