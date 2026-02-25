#!/usr/bin/env bash
set -euo pipefail

# ══════════════════════════════════════════════════════════════
# eMarketer CRM Instance Backup
#
# Usage: 
#   ./scripts/backup-instance.sh                    # backup all
#   ./scripts/backup-instance.sh <workspaceId>      # backup one
#
# Cron:
#   0 2 * * * /opt/emk/scripts/backup-instance.sh >> /var/log/emk-backup.log 2>&1
# ══════════════════════════════════════════════════════════════

BACKUP_ROOT="/opt/emk/backups"
INSTANCES_ROOT="/opt/emk/instances"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
SPECIFIC_WS="${1:-}"

mkdir -p "$BACKUP_ROOT"

log() { echo "[$(date -Iseconds)] $*"; }

backup_instance() {
    local WS_DIR="$1"
    local WS_ID=$(basename $(dirname "$WS_DIR"))
    local PRODUCT=$(basename "$WS_DIR")
    local BACKUP_DIR="${BACKUP_ROOT}/${WS_ID}/${PRODUCT}/${DATE}"
    
    log "📦 Backing up: ${WS_ID}/${PRODUCT}"
    mkdir -p "$BACKUP_DIR"
    
    # ── Backup .env (encrypted) ──
    if [ -f "${WS_DIR}/.env" ]; then
        cp "${WS_DIR}/.env" "${BACKUP_DIR}/env.backup"
        log "  ✅ .env backed up"
    fi
    
    # ── Backup database ──
    if [ -f "${WS_DIR}/.env" ]; then
        DB_URL=$(grep DATABASE_URL "${WS_DIR}/.env" | cut -d= -f2-)
        if [ -n "$DB_URL" ]; then
            DB_NAME=$(echo "$DB_URL" | grep -oP '\/([^?]+)' | head -1 | tr -d '/')
            if [ -n "$DB_NAME" ]; then
                pg_dump "$DB_NAME" | gzip > "${BACKUP_DIR}/db.sql.gz" 2>/dev/null && \
                    log "  ✅ Database backed up ($(du -h ${BACKUP_DIR}/db.sql.gz | cut -f1))" || \
                    log "  ⚠️  Database backup failed"
            fi
        fi
    fi
    
    # ── Backup uploads ──
    if [ -d "${WS_DIR}/uploads" ] && [ "$(ls -A ${WS_DIR}/uploads 2>/dev/null)" ]; then
        tar -czf "${BACKUP_DIR}/uploads.tar.gz" -C "${WS_DIR}" uploads 2>/dev/null && \
            log "  ✅ Uploads backed up ($(du -h ${BACKUP_DIR}/uploads.tar.gz | cut -f1))" || \
            log "  ⚠️  Uploads backup failed"
    fi
    
    # ── Backup docker-compose + deploy info ──
    [ -f "${WS_DIR}/docker-compose.yml" ] && cp "${WS_DIR}/docker-compose.yml" "${BACKUP_DIR}/"
    [ -f "${WS_DIR}/.deployed" ] && cp "${WS_DIR}/.deployed" "${BACKUP_DIR}/"
    
    # ── Write manifest ──
    cat > "${BACKUP_DIR}/manifest.json" << EOF
{
    "workspaceId": "${WS_ID}",
    "productKey": "${PRODUCT}",
    "backupDate": "${DATE}",
    "hostname": "$(hostname)",
    "files": $(ls -1 "${BACKUP_DIR}" | jq -R . | jq -s .)
}
EOF
    
    log "  📋 Manifest created"
}

# ── Run backups ──
if [ -n "$SPECIFIC_WS" ]; then
    # Backup specific workspace
    for ws_dir in "${INSTANCES_ROOT}/${SPECIFIC_WS}"/*/; do
        [ -d "$ws_dir" ] && backup_instance "$ws_dir"
    done
else
    # Backup all instances
    for ws_dir in "${INSTANCES_ROOT}"/*/*/; do
        [ -d "$ws_dir" ] && backup_instance "$ws_dir"
    done
fi

# ── Cleanup old backups ──
log "🧹 Cleaning backups older than ${RETENTION_DAYS} days..."
find "$BACKUP_ROOT" -type d -mindepth 3 -maxdepth 3 -mtime "+${RETENTION_DAYS}" -exec rm -rf {} \; 2>/dev/null || true
TOTAL_SIZE=$(du -sh "$BACKUP_ROOT" 2>/dev/null | cut -f1 || echo "0")
log "📊 Total backup size: ${TOTAL_SIZE}"

log "═══ Backup complete ═══"
