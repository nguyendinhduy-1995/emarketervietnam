#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════
# eMarketer CRM Instance Deployer — Production Hardened
# 
# Features:
#   • flock per domain/workspace (no race condition)
#   • Idempotency via orderId lock file
#   • Rollback on failure (cleanup container, DB, nginx)
#   • Audit logging
#
# Usage: ./deploy-instance.sh <payload.json>
# ══════════════════════════════════════════════════════════════

PAYLOAD_FILE="${1:?Usage: $0 <payload.json>}"
LOCK_DIR="/var/lock/emk-deploy"
mkdir -p "$LOCK_DIR"

# ── Parse payload ─────────────────────────────────────────────
ORDER_ID=$(jq -r '.orderId' "$PAYLOAD_FILE")
WORKSPACE_ID=$(jq -r '.workspaceId' "$PAYLOAD_FILE")
INSTANCE_ID=$(jq -r '.instanceId' "$PAYLOAD_FILE")
PRODUCT_KEY=$(jq -r '.productKey' "$PAYLOAD_FILE")
IMAGE_REF=$(jq -r '.imageRef' "$PAYLOAD_FILE")
PLAN_KEY=$(jq -r '.planKey' "$PAYLOAD_FILE")
DOMAIN=$(jq -r '.domain' "$PAYLOAD_FILE")
ADMIN_EMAIL=$(jq -r '.adminEmail' "$PAYLOAD_FILE")
BUSINESS_NAME=$(jq -r '.businessName' "$PAYLOAD_FILE")
CALLBACK_URL=$(jq -r '.callbackUrl' "$PAYLOAD_FILE")
CALLBACK_SECRET=$(jq -r '.callbackSecret' "$PAYLOAD_FILE")

# ── Directory convention ──────────────────────────────────────
INSTANCE_DIR="/opt/emk/instances/${WORKSPACE_ID}/${PRODUCT_KEY}"
LOG_FILE="${INSTANCE_DIR}/deploy.log"
WS_SHORT="${WORKSPACE_ID//-/_}"
WS_SHORT="${WS_SHORT:0:20}"
CONTAINER_NAME="emk-${PRODUCT_KEY,,}-${WS_SHORT}"
DB_NAME="crm_${WS_SHORT}"
DB_USER="crm_user_${WS_SHORT}"

log() { echo "[$(date -Iseconds)] $*" | tee -a "$LOG_FILE" 2>/dev/null || echo "$*"; }

# ══ FLOCK: prevent concurrent deploys for same workspace ══════
LOCK_FILE="${LOCK_DIR}/${WORKSPACE_ID}.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "ERROR: Deploy already running for workspace ${WORKSPACE_ID}. Exiting."
    exit 1
fi

# ══ IDEMPOTENCY: check if already deployed for this order ═════
IDEMPOTENCY_FILE="${INSTANCE_DIR}/.deployed"
if [ -f "$IDEMPOTENCY_FILE" ]; then
    PREV_ORDER=$(cat "$IDEMPOTENCY_FILE" 2>/dev/null || echo "")
    if [ "$PREV_ORDER" = "$ORDER_ID" ]; then
        log "⚠️  Instance already deployed for order ${ORDER_ID}. Skipping."
        # Still callback success (idempotent)
        curl -s -X POST "${CALLBACK_URL}" \
            -H "Authorization: Bearer ${CALLBACK_SECRET}" \
            -H "Content-Type: application/json" \
            -d "{\"instanceId\":\"${INSTANCE_ID}\",\"status\":\"DONE\",\"crmUrl\":\"https://${DOMAIN}\",\"idempotent\":true}" \
            2>/dev/null || true
        exit 0
    fi
    log "⚠️  Re-deploying: previous order ${PREV_ORDER} → new order ${ORDER_ID}"
fi

# ══ ROLLBACK function ═════════════════════════════════════════
DEPLOYED_CONTAINER=false
DEPLOYED_DB=false
DEPLOYED_NGINX=false

rollback() {
    log "🔴 ROLLING BACK deploy for order ${ORDER_ID}..."
    
    if $DEPLOYED_NGINX; then
        log "  Removing nginx config..."
        rm -f "/etc/nginx/sites-enabled/${DOMAIN}" 2>/dev/null || true
        rm -f "/etc/nginx/sites-available/${DOMAIN}" 2>/dev/null || true
        nginx -t && nginx -s reload 2>/dev/null || true
    fi
    
    if $DEPLOYED_CONTAINER; then
        log "  Stopping container..."
        cd "${INSTANCE_DIR}" 2>/dev/null && docker compose down 2>/dev/null || true
        docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
    fi
    
    if $DEPLOYED_DB; then
        log "  Dropping database..."
        sudo -u postgres dropdb "${DB_NAME}" 2>/dev/null || true
        sudo -u postgres psql -c "DROP ROLE IF EXISTS ${DB_USER};" 2>/dev/null || true
    fi
    
    # Remove idempotency file (allow retry)
    rm -f "$IDEMPOTENCY_FILE" 2>/dev/null || true
    
    # Callback failure
    curl -s -X POST "${CALLBACK_URL}" \
        -H "Authorization: Bearer ${CALLBACK_SECRET}" \
        -H "Content-Type: application/json" \
        -d "{\"instanceId\":\"${INSTANCE_ID}\",\"status\":\"FAILED\",\"error\":\"Deploy rolled back\"}" \
        2>/dev/null || true
    
    log "🔴 Rollback complete. Fix the issue and retry."
    exit 1
}

trap rollback ERR

# ══ START DEPLOY ══════════════════════════════════════════════
log "══ eMarketer Deployer ═══════════════════"
log "  Order:     ${ORDER_ID}"
log "  Workspace: ${WORKSPACE_ID}"
log "  Product:   ${PRODUCT_KEY}"
log "  Image:     ${IMAGE_REF}"
log "  Domain:    ${DOMAIN}"
log "═════════════════════════════════════════"

# ── Step 1: Create instance directory ─────────────────────────
mkdir -p "${INSTANCE_DIR}"

# ── Step 2: Pull Docker image ─────────────────────────────────
log "🐳 Pulling image: ${IMAGE_REF}..."
docker pull "${IMAGE_REF}" 2>&1 | tee -a "$LOG_FILE"

# ── Step 3: Create DB ─────────────────────────────────────────
DB_PASS=$(openssl rand -hex 16)
log "🗄 Creating database: ${DB_NAME}..."
sudo -u postgres createdb "${DB_NAME}" 2>/dev/null || log "DB already exists"
sudo -u postgres psql -c "
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
            CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
        END IF;
    END
    \$\$;
    GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
" 2>&1 | tee -a "$LOG_FILE"
DEPLOYED_DB=true

# ── Step 4: Generate secrets ──────────────────────────────────
JWT_SECRET=$(openssl rand -hex 32)
WORKSPACE_SECRET=$(openssl rand -hex 16)
ADMIN_PASS=$(openssl rand -base64 12 | tr -d '=/+' | head -c 12)

# ── Step 5: Render .env ───────────────────────────────────────
cat > "${INSTANCE_DIR}/.env" << ENVEOF
# Auto-generated by eMarketer Deployer — DO NOT EDIT
DATABASE_URL=postgresql://${DB_USER}:${DB_PASS}@localhost:5432/${DB_NAME}
HUB_API=https://hub.emarketervietnam.vn
WORKSPACE_ID=${WORKSPACE_ID}
INSTANCE_ID=${INSTANCE_ID}
ENTITLEMENT_PUBLIC_KEY=${ENTITLEMENT_PUBLIC_KEY:-}
DOMAIN=${DOMAIN}
JWT_SECRET=${JWT_SECRET}
JWT_AUD=${DOMAIN}
NODE_ENV=production
PORT=0
PRODUCT_KEY=${PRODUCT_KEY}
PLAN_KEY=${PLAN_KEY}
ENVEOF
log "📝 .env rendered"

# ── Step 6: Docker compose ────────────────────────────────────
PORT=$(shuf -i 10000-60000 -n 1)

cat > "${INSTANCE_DIR}/docker-compose.yml" << COMPEOF
version: '3.8'
services:
  app:
    image: ${IMAGE_REF}
    container_name: ${CONTAINER_NAME}
    restart: unless-stopped
    env_file: .env
    environment:
      - PORT=${PORT}
    ports:
      - "127.0.0.1:${PORT}:${PORT}"
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:${PORT}/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
COMPEOF

log "🚀 Starting container on port ${PORT}..."
cd "${INSTANCE_DIR}"
docker compose up -d 2>&1 | tee -a "$LOG_FILE"
DEPLOYED_CONTAINER=true

# ── Step 7: Run migrations + seed admin ───────────────────────
log "🔧 Running migrations..."
sleep 5
docker exec "${CONTAINER_NAME}" npx prisma migrate deploy 2>&1 | tee -a "$LOG_FILE" || {
    log "⚠️ Migration failed, trying db push..."
    docker exec "${CONTAINER_NAME}" npx prisma db push --accept-data-loss 2>&1 | tee -a "$LOG_FILE" || true
}

log "👤 Seeding admin user..."
docker exec "${CONTAINER_NAME}" node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    (async () => {
        const db = new PrismaClient();
        const hash = await bcrypt.hash('${ADMIN_PASS}', 12);
        await db.user.upsert({
            where: { email: '${ADMIN_EMAIL}' },
            create: { name: '${BUSINESS_NAME} Admin', email: '${ADMIN_EMAIL}', phone: '', password: hash, isAdmin: true, status: 'ACTIVE' },
            update: { password: hash, isAdmin: true },
        });
        console.log('Admin seeded OK');
        await db.\$disconnect();
    })();
" 2>&1 | tee -a "$LOG_FILE"

# ── Step 8: Configure reverse proxy + SSL ─────────────────────
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"
cat > "${NGINX_CONF}" << 'NGXEOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;
    location / {
        proxy_pass http://127.0.0.1:PORT_PLACEHOLDER;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 50M;
    }
}
NGXEOF
sed -i "s/DOMAIN_PLACEHOLDER/${DOMAIN}/g" "${NGINX_CONF}"
sed -i "s/PORT_PLACEHOLDER/${PORT}/g" "${NGINX_CONF}"

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}" 2>/dev/null || true
nginx -t && nginx -s reload 2>&1 | tee -a "$LOG_FILE"
DEPLOYED_NGINX=true

# SSL — only if DNS is already pointing to us
log "🔐 Attempting SSL..."
certbot certonly --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
    --email admin@emarketervietnam.vn 2>&1 | tee -a "$LOG_FILE" || {
    log "⚠️  SSL failed (DNS may not be pointing here yet). Cron will retry."
}

# ── Step 9: Health check ──────────────────────────────────────
log "🏥 Health check..."
HEALTHY=false
for i in {1..12}; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}/api/health" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
        log "✅ Health check passed!"
        HEALTHY=true
        break
    fi
    log "  Attempt ${i}/12 — status ${HTTP_CODE}"
    sleep 5
done

if ! $HEALTHY; then
    log "❌ Health check failed after 60s"
    rollback
fi

# ── Step 10: Callback to Hub ──────────────────────────────────
CRM_URL="https://${DOMAIN}"
log "📡 Calling back to Hub..."
CALLBACK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${CALLBACK_URL}" \
    -H "Authorization: Bearer ${CALLBACK_SECRET}" \
    -H "Content-Type: application/json" \
    -d "{
        \"instanceId\": \"${INSTANCE_ID}\",
        \"status\": \"DONE\",
        \"crmUrl\": \"${CRM_URL}\",
        \"port\": ${PORT},
        \"containerName\": \"${CONTAINER_NAME}\",
        \"adminEmail\": \"${ADMIN_EMAIL}\",
        \"adminPassword\": \"${ADMIN_PASS}\"
    }" 2>&1)
log "Callback response: ${CALLBACK_RESPONSE}"

# ── Mark as deployed (idempotency) ────────────────────────────
echo "${ORDER_ID}" > "${IDEMPOTENCY_FILE}"

# ── Remove trap ───────────────────────────────────────────────
trap - ERR

log ""
log "══ Deploy Complete ════════════════════════"
log "  URL:       ${CRM_URL}"
log "  Admin:     ${ADMIN_EMAIL}"
log "  Password:  ${ADMIN_PASS}"
log "  Container: ${CONTAINER_NAME}"
log "  Port:      ${PORT}"
log "  DB:        ${DB_NAME}"
log "═══════════════════════════════════════════"
