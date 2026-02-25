#!/bin/bash
# eMarketer Hub — Deploy Script
# Usage: ./scripts/deploy.sh

set -e

echo "🚀 eMarketer Hub — Deploy"
echo "========================="

# 1. Pull latest code
echo "📥 Git pull..."
git pull origin main

# 2. Install dependencies (if any new)
echo "📦 Installing dependencies..."
npm ci --production=false

# 3. Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate --schema=prisma/platform/schema.prisma

# 4. Push schema changes to DB
echo "💾 Pushing schema to database..."
npx prisma db push --schema=prisma/platform/schema.prisma --accept-data-loss

# 5. Build Next.js
echo "🏗️ Building production..."
npm run build

# 6. Restart PM2
echo "♻️ Restarting PM2..."
pm2 restart all || pm2 start npm --name "emk-hub" -- start

echo ""
echo "✅ Deploy complete!"
echo "🌐 Check: https://emarketervietnam.vn"
echo ""

# 7. Health check
sleep 3
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")
if [ "$HTTP_STATUS" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "⚠️ Health check returned $HTTP_STATUS — check logs: pm2 logs"
fi
