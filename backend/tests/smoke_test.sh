#!/usr/bin/env bash
set -euo pipefail

API_URL="${API_URL:-http://localhost:8000/api/v1}"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local method="$2"
  local path="$3"
  local expected_status="$4"
  local body="${5:-}"

  local args=(-s -o /tmp/smoke_body -w "%{http_code}" -X "$method")
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  if [ -n "${TOKEN:-}" ]; then
    args+=(-H "Authorization: Bearer $TOKEN")
  fi

  local status
  status=$(curl "${args[@]}" "${API_URL}${path}" 2>/dev/null || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo -e "  \033[0;32m✓\033[0m $desc (${status})"
    PASS=$((PASS + 1))
  else
    echo -e "  \033[0;31m✗\033[0m $desc (expected ${expected_status}, got ${status})"
    cat /tmp/smoke_body 2>/dev/null | head -1
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "=== English Fairy API Smoke Test ==="
echo "Target: $API_URL"
echo ""

# ── Health ──
echo "[Health]"
check "GET /health" GET "/../health" 200

# ── Auth: Signup ──
echo ""
echo "[Auth]"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test_${TIMESTAMP}@example.com"
TEST_PASSWORD="testpassword123"

SIGNUP_BODY=$(cat <<EOF
{
  "email": "${TEST_EMAIL}",
  "password": "${TEST_PASSWORD}",
  "display_name": "Test Parent",
  "parent_pin": "1234"
}
EOF
)
check "POST /auth/signup" POST "/auth/signup" 201 "$SIGNUP_BODY"

# Extract token
TOKEN=$(cat /tmp/smoke_body 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || echo "")
REFRESH=$(cat /tmp/smoke_body 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('refresh_token',''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "  [!] No token received, skipping authenticated tests"
  echo ""
  echo "=== Results: $PASS passed, $FAIL failed ==="
  exit $FAIL
fi

check "POST /auth/login" POST "/auth/login" 200 "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASSWORD}\"}"
check "POST /auth/refresh" POST "/auth/refresh" 200 "{\"refresh_token\":\"${REFRESH}\"}"
check "POST /auth/verify-pin (correct)" POST "/auth/verify-pin" 200 '{"pin":"1234"}'
check "POST /auth/verify-pin (wrong)" POST "/auth/verify-pin" 403 '{"pin":"9999"}'

# ── Extract user ID from token ──
USER_ID=$(echo "$TOKEN" | cut -d. -f2 | python3 -c "
import sys, base64, json
payload = sys.stdin.read().strip()
payload += '=' * (4 - len(payload) % 4)
print(json.loads(base64.urlsafe_b64decode(payload)).get('sub', ''))
" 2>/dev/null || echo "")

# ── Create child profile (direct DB insert via a helper endpoint would be ideal,
#     but for smoke test we'll test what's available) ──
echo ""
echo "[Curriculum] (requires child_id - testing 404 paths)"
check "GET /curriculum/map (no child)" GET "/curriculum/map?child_id=00000000-0000-0000-0000-000000000000" 404
check "GET /curriculum/lesson (no lesson)" GET "/curriculum/lesson/00000000-0000-0000-0000-000000000000?child_id=00000000-0000-0000-0000-000000000000" 404

# ── Game endpoints ──
echo ""
echo "[Gamification]"
check "GET /game/characters (no child)" GET "/game/characters?child_id=00000000-0000-0000-0000-000000000000" 404
check "GET /game/shop (no child)" GET "/game/shop?child_id=00000000-0000-0000-0000-000000000000" 404

# ── Review endpoints ──
echo ""
echo "[Review]"
check "GET /review/due (no child)" GET "/review/due?child_id=00000000-0000-0000-0000-000000000000" 200

# ── Talk endpoints ──
echo ""
echo "[Talk]"
check "GET /talk/scenarios (no child)" GET "/talk/scenarios?child_id=00000000-0000-0000-0000-000000000000" 404

# ── Parent endpoints ──
echo ""
echo "[Parent Dashboard]"
check "GET /parent/dashboard" GET "/parent/dashboard" 200

# ── Results ──
echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
echo ""

rm -f /tmp/smoke_body
exit $FAIL
