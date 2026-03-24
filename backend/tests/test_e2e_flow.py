"""
Integration test for full E2E learning flow.
Requires running backend: uvicorn app.main:app --port 8000

Usage:
    python -m tests.test_e2e_flow
    python -m tests.test_e2e_flow --base-url http://localhost:8000/api/v1
"""
from __future__ import annotations

import argparse
import sys
import time

import httpx

PASS = 0
FAIL = 0


def check(desc: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        print(f"  \033[32m✓\033[0m {desc}")
        PASS += 1
    else:
        print(f"  \033[31m✗\033[0m {desc} — {detail}")
        FAIL += 1


def run_tests(base_url: str):
    global PASS, FAIL
    client = httpx.Client(base_url=base_url, timeout=15)
    ts = str(int(time.time()))

    print("\n=== E2E Integration Test ===\n")

    # ── 1. Health ──
    print("[1. Health]")
    r = client.get("/../health")
    check("Health endpoint", r.status_code == 200, f"status={r.status_code}")

    # ── 2. Auth: Signup ──
    print("\n[2. Auth]")
    email = f"e2e_{ts}@test.com"
    password = "testpass123"
    r = client.post("/auth/signup", json={
        "email": email,
        "password": password,
        "display_name": "E2E Tester",
        "parent_pin": "1234",
    })
    check("Signup", r.status_code == 201, f"status={r.status_code} body={r.text[:200]}")
    tokens = r.json()
    token = tokens.get("access_token", "")
    headers = {"Authorization": f"Bearer {token}"}

    # Login
    r = client.post("/auth/login", json={"email": email, "password": password})
    check("Login", r.status_code == 200)

    # Verify PIN
    r = client.post("/auth/verify-pin", json={"pin": "1234"}, headers=headers)
    check("PIN verify (correct)", r.status_code == 200 and r.json().get("verified") is True)
    r = client.post("/auth/verify-pin", json={"pin": "0000"}, headers=headers)
    check("PIN verify (wrong)", r.status_code == 403)

    # ── 3. Create child profile ──
    print("\n[3. Child Profile]")
    r = client.post("/children", json={
        "nickname": "테스트아이",
        "birth_year": 2018,
    }, headers=headers)
    check("Create child", r.status_code == 201, f"status={r.status_code} body={r.text[:200]}")
    child = r.json()
    child_id = child.get("id", "")
    check("Child has ID", bool(child_id))
    check("Child initial phase=1", child.get("current_phase") == 1)
    check("Child initial month=1", child.get("current_month") == 1)
    check("Child initial xp=0", child.get("total_xp") == 0)

    # List children
    r = client.get("/children", headers=headers)
    check("List children", r.status_code == 200 and len(r.json()) >= 1)

    # ── 4. Curriculum map ──
    print("\n[4. Curriculum Map]")
    r = client.get(f"/curriculum/map?child_id={child_id}", headers=headers)
    check("Get curriculum map", r.status_code == 200, f"status={r.status_code}")
    cmap = r.json()
    check("Has 4 phases", len(cmap.get("phases", [])) == 4)
    lessons = cmap.get("lessons", [])
    check("Has 36 lessons", len(lessons) == 36, f"got {len(lessons)}")

    # Find first unlocked phonics lesson
    month1_phonics = [l for l in lessons if l["month"] == 1 and l["lesson_type"] == "phonics" and not l["is_locked"]]
    check("Month 1 phonics unlocked", len(month1_phonics) >= 1)

    if not month1_phonics:
        print("\n  [!] Cannot continue without unlocked lesson")
        return

    lesson_id = month1_phonics[0]["id"]

    # ── 5. Lesson detail ──
    print("\n[5. Lesson Detail]")
    r = client.get(f"/curriculum/lesson/{lesson_id}?child_id={child_id}", headers=headers)
    check("Get lesson detail", r.status_code == 200, f"status={r.status_code}")
    detail = r.json()
    items = detail.get("items", [])
    check(f"Lesson has {len(items)} items", len(items) > 0, f"got {len(items)}")
    check("Items have content_data", all("content_data" in i for i in items))

    # ── 6. Record learning result ──
    print("\n[6. Learning Record]")
    r = client.post(f"/progress/record?child_id={child_id}", json={
        "lesson_id": lesson_id,
        "lesson_type": "phonics",
        "score": 0.8,
        "total_items": 10,
        "correct_items": 8,
        "time_spent_seconds": 120,
    }, headers=headers)
    check("Record learning", r.status_code == 200, f"status={r.status_code} body={r.text[:200]}")
    record = r.json()
    check("XP earned > 0", record.get("xp_earned", 0) > 0, f"xp={record.get('xp_earned')}")

    # ── 7. Verify progress updated ──
    print("\n[7. Progress Update]")
    r = client.get(f"/children/{child_id}", headers=headers)
    check("Get child after learning", r.status_code == 200)
    updated_child = r.json()
    check("XP increased", updated_child.get("total_xp", 0) > 0, f"xp={updated_child.get('total_xp')}")

    # ── 8. Spaced repetition ──
    print("\n[8. Spaced Repetition]")
    r = client.post(f"/review/record?child_id={child_id}", json={
        "item_type": "sight_word",
        "item_key": "the",
        "score": 5,
    }, headers=headers)
    check("Submit review", r.status_code == 200, f"status={r.status_code}")
    review = r.json()
    check("Review has interval", review.get("interval_days", 0) >= 1)
    check("Review has ease_factor", review.get("ease_factor", 0) > 0)

    # Review again (wrong)
    r = client.post(f"/review/record?child_id={child_id}", json={
        "item_type": "sight_word",
        "item_key": "the",
        "score": 1,
    }, headers=headers)
    check("Submit wrong review", r.status_code == 200)
    review2 = r.json()
    check("Interval reset to 1 after wrong", review2.get("interval_days") == 1)

    # Get due items
    r = client.get(f"/review/due?child_id={child_id}", headers=headers)
    check("Get due reviews", r.status_code == 200)

    # ── 9. Characters ──
    print("\n[9. Characters]")
    r = client.get(f"/game/characters?child_id={child_id}", headers=headers)
    check("List characters", r.status_code == 200)
    chars = r.json()
    check("Has 36 characters", len(chars) == 36, f"got {len(chars)}")
    check("None collected initially", all(not c["is_collected"] for c in chars))

    # Unlock first character
    first_char_id = chars[0]["id"]
    r = client.post(f"/game/characters/unlock?child_id={child_id}", json={
        "character_id": first_char_id,
    }, headers=headers)
    check("Unlock character", r.status_code == 200, f"status={r.status_code}")
    unlock = r.json()
    check("Unlock success", unlock.get("success") is True)
    check("Unlock gives XP", unlock.get("xp_earned", 0) > 0)
    check("Unlock gives coins", unlock.get("coins_earned", 0) > 0)

    # Duplicate unlock should fail
    r = client.post(f"/game/characters/unlock?child_id={child_id}", json={
        "character_id": first_char_id,
    }, headers=headers)
    check("Duplicate unlock = 409", r.status_code == 409)

    # ── 10. Shop ──
    print("\n[10. Shop]")
    r = client.get(f"/game/shop?child_id={child_id}", headers=headers)
    check("List shop items", r.status_code == 200)
    shop = r.json()
    check("Has shop items", len(shop) > 0, f"got {len(shop)}")

    # Purchase cheapest item
    cheapest = min(shop, key=lambda s: s["price_coins"])
    r = client.post(f"/game/shop/purchase?child_id={child_id}", json={
        "item_id": cheapest["id"],
    }, headers=headers)
    if r.status_code == 200:
        check("Purchase item", True)
        check("Has remaining_coins", "remaining_coins" in r.json())
    elif r.status_code == 402:
        check("Purchase (insufficient coins)", True)
    else:
        check("Purchase item", False, f"status={r.status_code}")

    # ── 11. Conversation scenarios ──
    print("\n[11. Conversation]")
    r = client.get(f"/talk/scenarios?child_id={child_id}", headers=headers)
    check("List scenarios", r.status_code == 200)
    scenarios = r.json()
    check("Has scenarios for month 1", any(s["target_month"] == 1 for s in scenarios))

    # ── 12. Parent dashboard ──
    print("\n[12. Parent Dashboard]")
    r = client.get("/parent/dashboard", headers=headers)
    check("Get dashboard", r.status_code == 200)
    dash = r.json()
    check("Dashboard has children", len(dash.get("children", [])) >= 1)

    r = client.get(f"/parent/report/weekly/{child_id}", headers=headers)
    check("Get weekly report", r.status_code == 200)
    report = r.json()
    check("Report has daily_stats", len(report.get("daily_stats", [])) == 7)

    # ── Results ──
    print(f"\n=== Results: {PASS} passed, {FAIL} failed ===\n")
    client.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:8000/api/v1")
    args = parser.parse_args()
    run_tests(args.base_url)
    sys.exit(FAIL)
