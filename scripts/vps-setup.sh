#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════
# eMarketer Hub — VPS First-Time Setup
# 
# Run on production VPS after git pull.
# Sets up: DB migration, Ed25519 keys, env vars, seed products.
#
# Usage: bash scripts/vps-setup.sh
# ══════════════════════════════════════════════════════════════

echo "══ eMarketer Hub — VPS Setup ═══════════════"
echo ""

# ── Step 1: DB Migration ──────────────────────────────────────
echo "1️⃣  Running Prisma DB push..."
npx prisma db push --schema=prisma/platform/schema.prisma --skip-generate 2>&1 || {
    echo "⚠️  DB push failed. Check DATABASE_URL in .env"
    exit 1
}
echo "   ✅ Database schema synced"

# ── Step 2: Generate Ed25519 keys ─────────────────────────────
if [ -z "${ENTITLEMENT_PRIVATE_KEY:-}" ]; then
    echo ""
    echo "2️⃣  Generating Ed25519 entitlement keys..."
    node scripts/generate-entitlement-keys.js
    echo ""
    echo "⚠️  COPY the keys above into your .env file!"
    echo "   ENTITLEMENT_PRIVATE_KEY=<private>  (Hub .env ONLY)"
    echo "   ENTITLEMENT_PUBLIC_KEY=<public>     (Hub + all instances)"
    echo ""
    read -p "Have you added the keys to .env? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        echo "Please add keys to .env and re-run."
        exit 1
    fi
else
    echo "2️⃣  Ed25519 keys already set ✅"
fi

# ── Step 3: Verify env vars ──────────────────────────────────
echo ""
echo "3️⃣  Checking required env vars..."
MISSING=()
[ -z "${DATABASE_URL:-}" ] && MISSING+=("DATABASE_URL")
[ -z "${SERVER_IP:-}" ] && MISSING+=("SERVER_IP")
[ -z "${DEPLOY_CALLBACK_SECRET:-}" ] && MISSING+=("DEPLOY_CALLBACK_SECRET")
[ -z "${CRON_SECRET:-}" ] && MISSING+=("CRON_SECRET")
[ -z "${ADMIN_SECRET:-}" ] && MISSING+=("ADMIN_SECRET")

if [ ${#MISSING[@]} -gt 0 ]; then
    echo "   ⚠️  Missing env vars: ${MISSING[*]}"
    echo "   Add them to .env and restart."
else
    echo "   ✅ All required env vars set"
fi

# ── Step 4: Seed products ────────────────────────────────────
echo ""
echo "4️⃣  Seeding products..."
SEED_URL="${HUB_URL:-http://localhost:3000}/api/hub/seed-products"
SEED_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$SEED_URL" \
    -H "Authorization: Bearer ${ADMIN_SECRET:-admin}" 2>&1 || echo "FAILED")
echo "   Seed response: $SEED_RESPONSE"

# ── Step 5: Health check ─────────────────────────────────────
echo ""
echo "5️⃣  Health check..."
HEALTH_URL="${HUB_URL:-http://localhost:3000}/api/health"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Hub is healthy!"
else
    echo "   ⚠️  Health check failed (HTTP $HTTP_CODE)"
fi

echo ""
echo "══ Setup Complete ════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. Deploy demo instance (DEMO_MODE=true)"
echo "  2. Set GitHub Actions secrets"
echo "  3. Tag v1.0.0 for first Docker build"
echo "  4. Run E2E smoke test"
