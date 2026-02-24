# Production Deployment Checklist

> Last updated: 2026-02-24

## Pre-Deploy

### Environment Variables (Vercel Dashboard)
```
DATABASE_URL=postgresql://user:pass@host:5432/hub_platform?sslmode=require
JWT_SECRET=<strong-random-64-char>
CRON_SECRET=<strong-random-32-char>
WEBHOOK_SECRET=<strong-random-32-char>
NEXTAUTH_URL=https://emarketervietnam.vn

# Optional — Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
EMAIL_FROM=noreply@emarketervietnam.vn
EMAIL_FROM_NAME=eMarketer Hub
```

### Database
1. **Backup** current production DB
2. Run `npx prisma db push --schema=prisma/platform/schema.prisma` on production
3. Verify with `npx prisma studio` that all tables exist

### DNS
- `emarketervietnam.vn` → Vercel
- `*.emarketervietnam.vn` → Vercel (wildcard for CRM subdomains)

## Deploy Steps

1. `git push origin main` (already done)
2. Vercel auto-deploys from main
3. After deploy, verify:
   - `curl https://emarketervietnam.vn/api/health` → `{ "status": "healthy" }`
   - Browse `/hub/marketplace` to see products
   - Login to `/emk-crm` with admin credentials

## Post-Deploy Verification

### Cron Jobs
- Verify in Vercel Dashboard → Settings → Cron Jobs
- `entitlement-expire`: runs at 2AM UTC daily
- `subscription-renew`: runs at 3AM UTC daily

### Monitoring
- `/api/health` → health check (set up UptimeRobot or similar)
- Check Vercel Functions logs for errors
- Monitor database connections (max pool = 20)

### Security Checklist
- [ ] All env vars set in Vercel
- [ ] CORS headers configured
- [ ] Rate limiting on auth endpoints
- [ ] HTTPS enforced
- [ ] Secure cookies (HttpOnly, SameSite=Strict)
- [ ] Admin credentials changed from defaults

## Rollback
If issues found:
1. Vercel Dashboard → Deployments → Click previous deployment → Promote
2. Or: `git revert HEAD && git push`
