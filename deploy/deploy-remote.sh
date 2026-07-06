#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

: "${PROD_HOST:?Set PROD_HOST to the production server host or IP.}"

PROD_USER="${PROD_USER:-ubuntu}"
PROD_PATH="${PROD_PATH:-/opt/english-learning-platform}"
REMOTE="${PROD_USER}@${PROD_HOST}"
STAMP="$(date +%Y%m%d%H%M%S)"
BUNDLE="${TMPDIR:-/tmp}/english-learning-platform-${STAMP}.tar.gz"
BUNDLE_NAME="$(basename "$BUNDLE")"

echo "[1/4] Creating deploy bundle: $BUNDLE"
tar \
  --exclude-vcs \
  --exclude='./frontend/node_modules' \
  --exclude='./frontend/.next' \
  --exclude='./backend/.venv' \
  --exclude='./backend/venv' \
  --exclude='./node_modules' \
  --exclude='./.env' \
  --exclude='./.env.local' \
  --exclude='./.env.development' \
  --exclude='./.env.production' \
  --exclude='./.env.test' \
  --exclude='./backend/.env' \
  --exclude='./backend/.env.local' \
  --exclude='./backend/.env.production' \
  --exclude='./frontend/.env.local' \
  --exclude='./frontend/.env.production' \
  --exclude='./*.tar.gz' \
  -czf "$BUNDLE" \
  -C "$PROJECT_ROOT" .

echo "[2/4] Preparing remote path: $REMOTE:$PROD_PATH"
ssh "$REMOTE" "mkdir -p '$PROD_PATH'"

echo "[3/4] Uploading bundle"
scp "$BUNDLE" "$REMOTE:/tmp/$BUNDLE_NAME"

echo "[4/4] Extracting and deploying on production server"
ssh "$REMOTE" "
  set -euo pipefail
  tar -xzf '/tmp/$BUNDLE_NAME' -C '$PROD_PATH'
  rm -f '/tmp/$BUNDLE_NAME'
  test -f '$PROD_PATH/.env.production' || {
    echo 'Missing $PROD_PATH/.env.production on production server.' >&2
    echo 'Create it from .env.production.example before deploying.' >&2
    exit 1
  }
  cd '$PROD_PATH/deploy'
  ./deploy.sh
"

echo "Production deploy finished: $REMOTE:$PROD_PATH"
