"""
Verify seed data integrity without requiring a database connection.

Usage:
    python -m app.scripts.verify_seed_data
"""
from __future__ import annotations

import json
from pathlib import Path

SEED_DIR = Path(__file__).parent / "seed_data"

EXPECTED_FILES = [
    "phases.json",
    "phonics_words.json",
    "sight_words.json",
    "sentence_patterns.json",
    "lessons.json",
    "lesson_items.json",
    "lesson_items_extended.json",
    "characters.json",
    "gamification.json",
    "stories.json",
]


def _load(filename: str):
    with open(SEED_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def verify() -> None:
    print("=== Seed Data Verification ===\n")

    for fname in EXPECTED_FILES:
        path = SEED_DIR / fname
        if not path.exists():
            print(f"  MISSING: {fname}")
            continue
        print(f"  OK: {fname} ({path.stat().st_size:,} bytes)")

    print()

    # Phases
    phases = _load("phases.json")
    print(f"Phases: {len(phases)}")
    for p in phases:
        print(f"  Phase {p['phase_number']}: Month {p['start_month']}-{p['end_month']} — {p['title_ko']}")

    # Phonics words
    pw = _load("phonics_words.json")
    levels = {}
    for w in pw:
        levels.setdefault(w["phonics_level"], []).append(w["word"])
    print(f"\nPhonics words: {len(pw)} total")
    for level, words in levels.items():
        print(f"  {level}: {len(words)} words — {', '.join(words[:5])}...")

    # Sight words
    sw = _load("sight_words.json")
    sw_phases = {}
    for w in sw:
        sw_phases.setdefault(w["phase"], []).append(w["word"])
    print(f"\nSight words: {len(sw)} total")
    for phase, words in sw_phases.items():
        print(f"  {phase}: {len(words)} words")

    # Sentence patterns
    sp = _load("sentence_patterns.json")
    sp_months = {}
    for p in sp:
        sp_months.setdefault(p["month"], []).append(p["pattern_type"])
    print(f"\nSentence patterns: {len(sp)} total")
    for month, types in sorted(sp_months.items()):
        print(f"  Month {month}: {len(types)} patterns — {', '.join(set(types))}")

    # Lessons
    lessons = _load("lessons.json")
    lesson_months = {}
    for l in lessons:
        lesson_months.setdefault(l["month"], []).append(l["lesson_type"])
    print(f"\nLessons: {len(lessons)} total")
    for month, types in sorted(lesson_months.items()):
        print(f"  Month {month}: {', '.join(types)}")

    # Characters
    chars = _load("characters.json")
    char_phases = {}
    char_rarities = {}
    for c in chars:
        char_phases.setdefault(c["phase_number"], []).append(c["name"])
        char_rarities.setdefault(c["rarity"], []).append(c["name"])
    print(f"\nCharacters: {len(chars)} total")
    for phase, names in sorted(char_phases.items()):
        print(f"  Phase {phase}: {len(names)} characters")
    for rarity, names in char_rarities.items():
        print(f"  {rarity}: {len(names)}")

    # Gamification
    gam = _load("gamification.json")
    print(f"\nBadges: {len(gam['badges'])}")
    print(f"Shop items: {len(gam['shop_items'])}")
    categories = {}
    for item in gam["shop_items"]:
        categories.setdefault(item["category"], []).append(item["name"])
    for cat, items in categories.items():
        print(f"  {cat}: {len(items)} items")
    print(f"Conversation scenarios: {len(gam['conversation_scenarios'])}")
    for s in gam["conversation_scenarios"]:
        print(f"  Month {s['target_month']}: {s['title_ko']} ({len(s['allowed_vocabulary'])} vocab)")

    # Stories
    stories = _load("stories.json")
    print(f"\nStories: {len(stories)}")
    total_pages = sum(len(s["pages"]) for s in stories)
    total_quizzes = sum(len(s.get("quizzes", [])) for s in stories)
    for s in stories:
        genre = "F" if s["is_fiction"] else "NF"
        print(f"  Month {s['target_month']}: {s['title']} ({genre}, L{s['lexile_min']}-{s['lexile_max']}, {len(s['pages'])}p)")
    print(f"  Total pages: {total_pages}, Total quizzes: {total_quizzes}")

    # Lesson items
    li_base = _load("lesson_items.json")
    li_ext = _load("lesson_items_extended.json")
    li_count = 0
    for section in li_base.values():
        if isinstance(section, dict):
            for items in section.values():
                li_count += len(items)
    for section in li_ext.values():
        if isinstance(section, dict):
            for items in section.values():
                li_count += len(items)
    print(f"\nLesson items: {li_count} total (base + extended)")

    # Tuning config
    tuning_path = Path(__file__).parent.parent / "core" / "tuning.json"
    if tuning_path.exists():
        tuning = json.loads(tuning_path.read_text(encoding="utf-8"))
        groups = list(tuning.get("groups", {}).keys())
        print(f"\nTuning groups: {groups}")
        for g in groups:
            thresholds = tuning.get("level_thresholds", {}).get(g, [])
            xp_r = tuning.get("xp_rewards", {}).get(g, {})
            print(f"  {g}: {len(thresholds)} levels, phonics_xp={xp_r.get('phonics_lesson_complete', '?')}")
    else:
        print("\n  WARNING: tuning.json not found")

    # Cross-reference check
    print("\n=== Cross-reference Validation ===")
    lesson_months_set = {l["month"] for l in lessons}
    phase_months = set()
    for p in phases:
        for m in range(p["start_month"], p["end_month"] + 1):
            phase_months.add(m)

    missing = phase_months - lesson_months_set
    if missing:
        print(f"  WARNING: Months with no lessons: {sorted(missing)}")
    else:
        print(f"  OK: All {len(phase_months)} months have lessons")

    lesson_phase_nums = {l["phase_number"] for l in lessons}
    phase_nums = {p["phase_number"] for p in phases}
    if lesson_phase_nums - phase_nums:
        print(f"  WARNING: Lessons reference non-existent phases: {lesson_phase_nums - phase_nums}")
    else:
        print("  OK: All lesson phase references valid")

    total_xp = sum(l["xp_reward"] for l in lessons)
    print(f"\n  Total XP from all lessons: {total_xp}")
    print(f"  Total collectible characters: {len(chars)}")
    print(f"  Total sight words: {len(sw)}")
    print(f"  Total phonics words: {len(pw)}")
    print(f"  Total lesson items: {li_count}")
    print(f"  Total stories: {len(stories)} ({total_pages} pages, {total_quizzes} quizzes)")

    print("\n=== Verification Complete ===")


if __name__ == "__main__":
    verify()
