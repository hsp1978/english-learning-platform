#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/backend/.env"

if [ -f "$ENV_FILE" ]; then
  echo "[!] backend/.env already exists. Delete it first to regenerate."
  exit 1
fi

APP_SECRET=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
DB_PASS=$(openssl rand -hex 16)
REDIS_PASS=$(openssl rand -hex 16)

cp "${SCRIPT_DIR}/backend/.env.example" "$ENV_FILE"

# Replace values (works on both macOS and Linux)
sed -i.bak "s|APP_SECRET_KEY=change-me-to-random-secret|APP_SECRET_KEY=${APP_SECRET}|" "$ENV_FILE"
sed -i.bak "s|JWT_SECRET_KEY=change-me-to-jwt-secret|JWT_SECRET_KEY=${JWT_SECRET}|" "$ENV_FILE"
sed -i.bak "s|DB_PASSWORD=change-me|DB_PASSWORD=${DB_PASS}|" "$ENV_FILE"
rm -f "${ENV_FILE}.bak"

# Frontend .env.local
FE_ENV="${SCRIPT_DIR}/frontend/.env.local"
if [ ! -f "$FE_ENV" ]; then
  cp "${SCRIPT_DIR}/frontend/.env.example" "$FE_ENV"
fi

echo "[✓] Generated backend/.env with random secrets"
echo "    DB_PASSWORD=${DB_PASS}"
echo "    APP_SECRET_KEY=${APP_SECRET:0:8}..."
echo "    JWT_SECRET_KEY=${JWT_SECRET:0:8}..."
echo ""
echo "Next: ./bootstrap.sh"
