"""
Verify seed data integrity without requiring a database connection.

Usage:
    python -m app.scripts.verify_seed_data
"""
from __future__ import annotations

import json
import re
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

CONVERSATION_FUNCTION_WORDS = {"hello", "hi", "bye"}


def _load(filename: str):
    with open(SEED_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def _words_from_text(text: str) -> set[str]:
    return {word.lower() for word in re.findall(r"[A-Za-z]+", text)}


def _merge_lesson_items(base: dict, ext: dict) -> dict:
    merged = json.loads(json.dumps(base))
    for section in ["sight_word_lesson_items", "sentence_lesson_items"]:
        if section not in merged:
            merged[section] = {}
        for month_key, items in ext.get(section, {}).items():
            if month_key not in merged[section]:
                merged[section][month_key] = items
    return merged


def _learned_words_by_month(
    lesson_items: dict,
    start_month: int,
    end_month: int,
) -> dict[int, set[str]]:
    learned: set[str] = set()
    learned_by_month: dict[int, set[str]] = {}
    for month in range(start_month, end_month + 1):
        month_key = f"month_{month}"
        for item in lesson_items.get("phonics_lesson_items", {}).get(month_key, []):
            content = item["content_data"]
            if "word" in content:
                learned.add(content["word"].lower())
            if "keyword" in content:
                learned.add(content["keyword"].lower())

        for item in lesson_items.get("sight_word_lesson_items", {}).get(month_key, []):
            learned.add(item["content_data"]["word"].lower())

        learned_by_month[month] = set(learned)

    return learned_by_month


def _validate_curriculum_sequence(
    *,
    phases: list[dict],
    sentence_patterns: list[dict],
    lesson_items: dict,
    scenarios: list[dict],
    stories: list[dict],
) -> list[str]:
    phase_months = {
        month
        for phase in phases
        for month in range(phase["start_month"], phase["end_month"] + 1)
    }
    if not phase_months:
        return ["No phase months are defined"]

    learned_by_month = _learned_words_by_month(
        lesson_items,
        min(phase_months),
        max(phase_months),
    )
    errors: list[str] = []

    for month_key, items in lesson_items.get("sentence_lesson_items", {}).items():
        month = int(month_key.replace("month_", ""))
        learned = learned_by_month.get(month, set())
        for item in items:
            sentence = item["content_data"].get("example_sentence", "")
            missing = sorted(_words_from_text(sentence) - learned)
            if missing:
                errors.append(
                    f"Sentence item Month {month} uses unintroduced words "
                    f"{missing}: {sentence}"
                )

    for item in sentence_patterns:
        month = item["month"]
        learned = learned_by_month.get(month, set())
        missing = sorted(_words_from_text(item["example_sentence"]) - learned)
        if missing:
            errors.append(
                f"Sentence pattern Month {month} uses unintroduced words "
                f"{missing}: {item['example_sentence']}"
            )

    for scenario in scenarios:
        month = scenario["target_month"]
        if month not in phase_months:
            errors.append(
                f"Conversation scenario '{scenario['title']}' targets invalid month {month}"
            )
            continue

        learned = learned_by_month.get(month, set())
        allowed_vocab = {word.lower() for word in scenario["allowed_vocabulary"]}
        missing_vocab = sorted(
            word
            for word in allowed_vocab
            if word not in learned and word not in CONVERSATION_FUNCTION_WORDS
        )
        if missing_vocab:
            errors.append(
                f"Conversation scenario '{scenario['title']}' Month {month} "
                f"allows unintroduced words {missing_vocab}"
            )

        permitted = allowed_vocab | CONVERSATION_FUNCTION_WORDS
        for starter in scenario["starter_messages"]:
            missing_starter = sorted(_words_from_text(starter) - permitted)
            if missing_starter:
                errors.append(
                    f"Conversation scenario '{scenario['title']}' starter uses words "
                    f"outside allowed_vocabulary {missing_starter}: {starter}"
                )

    for story in stories:
        month = story["target_month"]
        if month not in phase_months:
            errors.append(f"Story '{story['title']}' targets invalid month {month}")

    return errors


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
    merged_lesson_items = _merge_lesson_items(li_base, li_ext)
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

    sequence_errors = _validate_curriculum_sequence(
        phases=phases,
        sentence_patterns=sp,
        lesson_items=merged_lesson_items,
        scenarios=gam["conversation_scenarios"],
        stories=stories,
    )
    if sequence_errors:
        print("\n  ERROR: Curriculum sequence validation failed")
        for error in sequence_errors:
            print(f"    - {error}")
        raise SystemExit(1)
    print("  OK: Curriculum sequence validation passed")

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
