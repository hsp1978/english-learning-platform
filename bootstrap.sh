#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Step 1: Check prerequisites ──
echo ""
echo "============================================"
echo "  English Fairy - Local Bootstrap"
echo "============================================"
echo ""

command -v docker >/dev/null 2>&1 || err "docker is required. Install: https://docs.docker.com/get-docker/"
command -v python3 >/dev/null 2>&1 || err "python3 is required."
command -v node >/dev/null 2>&1 || err "node is required. Install: https://nodejs.org/"
log "Prerequisites checked"

# ── Step 2: Create .env with auto-generated secrets ──
if [ ! -f backend/.env ]; then
  chmod +x generate_env.sh
  ./generate_env.sh
else
  log "backend/.env already exists"
fi

if [ ! -f frontend/.env.local ]; then
  cp frontend/.env.example frontend/.env.local
  log "Created frontend/.env.local from template"
else
  log "frontend/.env.local already exists"
fi

# ── Step 3: Start infrastructure (PostgreSQL + Redis + MinIO) ──
echo ""
log "Starting infrastructure services..."
cd backend
docker compose up -d db redis minio
log "Waiting for PostgreSQL to be ready..."

MAX_RETRIES=30
RETRY_COUNT=0
until docker compose exec -T db pg_isready -U english_fairy -q 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    err "PostgreSQL failed to start after ${MAX_RETRIES} attempts"
  fi
  sleep 1
done
log "PostgreSQL is ready"

until docker compose exec -T redis redis-cli ping 2>/dev/null | grep -q PONG; do
  sleep 1
done
log "Redis is ready"
cd ..

# ── Step 4: Python virtual environment + dependencies ──
echo ""
log "Setting up Python environment..."
cd backend

if [ ! -d .venv ]; then
  python3 -m venv .venv
  log "Created virtual environment"
fi

source .venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
log "Python dependencies installed"

# ── Step 5: Database migration ──
echo ""
log "Running database migrations..."

# Generate initial migration if none exists
MIGRATION_COUNT=$(find alembic/versions -name "*.py" 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -eq 0 ]; then
  alembic revision --autogenerate -m "initial_schema"
  log "Generated initial migration"
fi

alembic upgrade head
log "Database schema up to date"

# ── Step 6: Seed curriculum data ──
echo ""
log "Seeding curriculum data..."
python -m app.scripts.seed_curriculum
log "Seed data loaded"

# ── Step 7: Verify seed data ──
echo ""
python -m app.scripts.verify_seed_data

# ── Step 8: Start backend API ──
echo ""
log "Starting backend API server..."
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
log "Backend API started (PID: $BACKEND_PID)"

# Wait for backend to be ready
sleep 3
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>/dev/null || echo "000")
if [ "$HEALTH_STATUS" = "200" ]; then
  log "Backend health check passed"
else
  warn "Backend may still be starting (status: $HEALTH_STATUS)"
fi

deactivate
cd ..

# ── Step 9: Frontend setup ──
echo ""
log "Setting up frontend..."
cd frontend

if [ ! -d node_modules ]; then
  npm install
  log "Node dependencies installed"
else
  log "Node dependencies already installed"
fi

# ── Step 10: Start frontend dev server ──
echo ""
log "Starting frontend dev server..."
npm run dev &
FRONTEND_PID=$!
log "Frontend dev server started (PID: $FRONTEND_PID)"
cd ..

# ── Done ──
echo ""
echo "============================================"
echo -e "  ${GREEN}Bootstrap complete!${NC}"
echo ""
echo "  Backend API:  http://localhost:8000"
echo "  API Docs:     http://localhost:8000/docs"
echo "  Frontend:     http://localhost:3000"
echo "  MinIO:        http://localhost:9001"
echo ""
echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  To stop: kill $BACKEND_PID $FRONTEND_PID"
echo "  To stop infra: cd backend && docker compose down"
echo "============================================"
echo ""

wait
