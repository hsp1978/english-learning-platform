#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

ENV_FILE="${PROJECT_ROOT}/.env.production"

# ── Checks ──
echo ""
echo "============================================"
echo "  English Fairy - Production Deploy"
echo "============================================"
echo ""

[ -f "$ENV_FILE" ] || err ".env.production not found. Copy .env.production.example and fill in values."

# Validate critical env vars
source "$ENV_FILE"
[ "${DB_PASSWORD:-}" != "CHANGE_ME_STRONG_PASSWORD" ] || err "DB_PASSWORD is still default. Change it."
[ "${APP_SECRET_KEY:-}" != "CHANGE_ME_RANDOM_64CHAR_STRING" ] || err "APP_SECRET_KEY is still default. Change it."
[ "${JWT_SECRET_KEY:-}" != "CHANGE_ME_JWT_SECRET_64CHAR" ] || err "JWT_SECRET_KEY is still default. Change it."
log "Environment validated"

# ── Build ──
echo ""
log "Building images..."
docker compose --env-file "$ENV_FILE" build --no-cache
log "Images built"

# ── Deploy ──
echo ""
log "Starting services..."
docker compose --env-file "$ENV_FILE" up -d
log "Services started"

# ── Wait for DB ──
log "Waiting for database..."
MAX_RETRIES=30
RETRY=0
until docker compose exec -T db pg_isready -U "${DB_USER}" -q 2>/dev/null; do
  RETRY=$((RETRY + 1))
  [ $RETRY -lt $MAX_RETRIES ] || err "Database failed to start"
  sleep 2
done
log "Database ready"

# ── Migrate ──
log "Running migrations..."
docker compose exec -T api alembic upgrade head
log "Migrations complete"

# ── Seed (only if empty) ──
log "Checking seed data..."
PHASE_COUNT=$(docker compose exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" -tAc "SELECT COUNT(*) FROM curriculum_phases;" 2>/dev/null || echo "0")
if [ "${PHASE_COUNT}" = "0" ]; then
  log "Seeding curriculum data..."
  docker compose exec -T api python -m app.scripts.seed_curriculum
  log "Seed complete"
else
  log "Seed data already exists (${PHASE_COUNT} phases)"
fi

# ── Health check ──
echo ""
log "Running health checks..."
sleep 5

API_STATUS=$(docker compose exec -T haproxy wget -q -O- http://api:8000/health 2>/dev/null | head -1 || echo "failed")
if echo "$API_STATUS" | grep -q "ok"; then
  log "API health: OK"
else
  warn "API health check: $API_STATUS"
fi

# ── Status ──
echo ""
echo "============================================"
echo -e "  ${GREEN}Deploy complete!${NC}"
echo ""
echo "  Services:"
docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps
echo ""

if [ -n "${CLOUDFLARE_TUNNEL_TOKEN:-}" ] && [ "${CLOUDFLARE_TUNNEL_TOKEN}" != "YOUR_TUNNEL_TOKEN" ]; then
  log "Cloudflare Tunnel active"
  echo "  Public URL: https://$(echo "${NEXT_PUBLIC_APP_URL}" | sed 's|https://||')"
else
  warn "Cloudflare Tunnel not configured"
  echo "  Local: http://localhost:${HAPROXY_HTTP_PORT:-80}"
fi

echo ""
echo "  HAProxy stats: http://localhost:${HAPROXY_STATS_PORT:-8404}/stats"
echo ""
echo "  Useful commands:"
echo "    docker compose logs -f api          # API logs"
echo "    docker compose logs -f frontend     # Frontend logs"
echo "    docker compose exec api alembic upgrade head  # Run migrations"
echo "    docker compose restart api          # Restart API"
echo "============================================"
