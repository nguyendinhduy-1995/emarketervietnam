# 📝 VPS Production Notes — eMarketer Hub

> Lưu ý quan trọng khi vận hành VPS `76.13.190.139`

## 🏗️ Kiến trúc VPS

| Service | Runtime | Port | Data |
|---------|---------|------|------|
| **emk-hub** | PM2 (Node 20) | :3000 | DB: `emk_hub` (system Postgres) |
| thayduy-app | Docker | :3000 (internal) | thayduy-postgres container |
| taplai-app | Docker | :3000 (internal) | (shared) |
| smk-app | Docker | :3000 (internal) | smk-postgres container |
| n8n | Docker | :5678 | n8n-postgres container |

> **Quy tắc #1**: emk-hub dùng PM2, các app khác dùng Docker. **KHÔNG BAO GIỜ** đụng Docker khi deploy emk-hub.

## 🔐 Env Vars (17 biến trong .env)

| Biến | Mục đích | Ai giữ |
|------|----------|--------|
| `DATABASE_URL` | Postgres `emk_hub` | Hub only |
| `ENTITLEMENT_PRIVATE_KEY` | Ký snapshot Ed25519 | **Hub only — TUYỆT MẬT** |
| `ENTITLEMENT_PUBLIC_KEY` | Verify snapshot | Hub + CRM instances |
| `ADMIN_SECRET` | Auth admin API | Hub only |
| `CRON_SECRET` | Auth cron jobs | Hub only |
| `DEPLOY_CALLBACK_SECRET` | Deployer callback auth | Hub + deployer script |
| `SERVER_IP` | A record cho domain verify | Hub only |
| `JWT_SECRET` | Session signing | Hub only |
| `NEXTAUTH_SECRET` | NextAuth | Hub only |
| `GEMINI_API_KEY` | AI features | Hub only |
| `OPENAI_API_KEY` | AI features | Hub only |

## ⏰ Cron Jobs

| Schedule | Job | Endpoint |
|----------|-----|----------|
| `0 3 * * *` | Demo reset | `/api/cron/demo-reset` |
| `0 6 * * *` | Subscription check | `/api/cron/subscription-check` |
| `0 6 * * *` | Process all (legacy) | `/api/cron/process-all` |

## 🚀 Deploy Checklist (an toàn)

```bash
cd /var/www/emk-hub
git stash && git pull origin main
npm install --production=false
npx prisma generate --schema=prisma/platform/schema.prisma
npx prisma db push --schema=prisma/platform/schema.prisma  # CHỈ ADD, KHÔNG DROP
npm run build
pm2 restart emk-hub --update-env
curl -s http://localhost:3000/api/health  # expect 200
docker ps  # verify other apps untouched
```

## ⚠️ LƯU Ý QUAN TRỌNG

1. **KHÔNG chạy `prisma migrate reset`** — sẽ XÓA hết data
2. **KHÔNG dùng `docker-compose down`** — sẽ tắt thayduy/smk/taplai
3. **KHÔNG đổi port 3000** — Nginx proxy phụ thuộc vào port này
4. **Backup trước khi deploy**: `cp .env .env.backup.$(date +%s)`
5. **Ed25519 private key**: Nếu bị lộ, phải generate lại và cập nhật TẤT CẢ instances
6. **Cron log**: Xem `/var/log/emk-cron.log` nếu có lỗi
7. **PM2 log**: `pm2 logs emk-hub --lines 50`

## 🔗 Domains

- `emarketervietnam.vn` — Landing page
- `hub.emarketervietnam.vn` — Hub dashboard
- `crm.emarketervietnam.vn` — CRM demo

## 📊 Monitoring

```bash
pm2 monit          # CPU/RAM real-time
pm2 logs emk-hub   # Application logs
docker stats       # Docker container resources
df -h              # Disk usage (current: 16GB/193GB)
free -h            # Memory (current: 2.9GB/15GB used)
```
