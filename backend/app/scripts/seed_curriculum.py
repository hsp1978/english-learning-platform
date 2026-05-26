"""
Seed the database with curriculum data.

Usage:
    python -m app.scripts.seed_curriculum
    python -m app.scripts.seed_curriculum --reset  (drop and recreate all tables first)
"""
from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import Base, async_session_factory, engine
from app.models.models import (
    Badge,
    Character,
    ConversationScenario,
    CurriculumPhase,
    Lesson,
    LessonItem,
    LLMTier,
    PhonicsWord,
    SentencePattern,
    ShopItem,
    SightWord,
    Story,
    StoryPage,
    StoryQuiz,
)

settings = get_settings()
SEED_DIR = Path(__file__).parent / "seed_data"


def _load_json(filename: str) -> Any:
    filepath = SEED_DIR / filename
    with open(filepath, encoding="utf-8") as f:
        return json.load(f)


def _apply_values(obj: Any, values: dict[str, Any]) -> bool:
    """Apply seed values to an existing ORM object and report whether it changed."""
    changed = False
    for key, value in values.items():
        if getattr(obj, key) != value:
            setattr(obj, key, value)
            changed = True
    return changed


def _lesson_item_signature(item: LessonItem) -> tuple[int, str, dict]:
    return (item.order_index, item.content_type, item.content_data)


def _lesson_item_seed_signature(item: dict[str, Any]) -> tuple[int, str, dict]:
    return (item["order_index"], item["content_type"], item["content_data"])


def _story_page_signature(page: StoryPage) -> tuple[int, str, list]:
    return (page.page_number, page.text_content, page.words_data)


def _story_page_seed_signature(page: dict[str, Any]) -> tuple[int, str, list]:
    return (page["page_number"], page["text_content"], page["words_data"])


def _story_quiz_signature(quiz: StoryQuiz) -> tuple[str, str, list, int]:
    return (quiz.question_type, quiz.question_text, quiz.choices, quiz.correct_index)


def _story_quiz_seed_signature(quiz: dict[str, Any]) -> tuple[str, str, list, int]:
    return (
        quiz["question_type"],
        quiz["question_text"],
        quiz["choices"],
        quiz["correct_index"],
    )


async def _seed_phases(db: AsyncSession) -> dict[int, int]:
    """Seed curriculum phases. Returns {phase_number: phase_id}."""
    data = _load_json("phases.json")
    mapping: dict[int, int] = {}
    created = 0
    updated = 0

    for i, item in enumerate(data, start=1):
        existing = await db.execute(
            select(CurriculumPhase).where(
                CurriculumPhase.phase_number == item["phase_number"]
            )
        )
        phase = existing.scalar_one_or_none()
        values = {
            "phase_number": item["phase_number"],
            "title": item["title"],
            "title_ko": item["title_ko"],
            "description": item["description"],
            "start_month": item["start_month"],
            "end_month": item["end_month"],
        }
        if phase is not None:
            if _apply_values(phase, values):
                updated += 1
            mapping[item["phase_number"]] = phase.id
            continue

        phase = CurriculumPhase(id=i, **values)
        db.add(phase)
        mapping[item["phase_number"]] = i
        created += 1

    await db.flush()
    print(f"  Phases: {created} new, {updated} updated / {len(data)} total")
    return mapping


async def _seed_phonics_words(db: AsyncSession) -> None:
    data = _load_json("phonics_words.json")
    created = 0
    updated = 0
    for item in data:
        existing = await db.execute(
            select(PhonicsWord).where(PhonicsWord.word == item["word"])
        )
        word = existing.scalar_one_or_none()
        values = {
            "word": item["word"],
            "phonemes": item["phonemes"],
            "phonics_level": item["phonics_level"],
            "pattern": item["pattern"],
        }
        if word is not None:
            if _apply_values(word, values):
                updated += 1
            continue

        db.add(PhonicsWord(**values))
        created += 1

    await db.flush()
    print(f"  Phonics words: {created} new, {updated} updated / {len(data)} total")


async def _seed_sight_words(db: AsyncSession) -> None:
    data = _load_json("sight_words.json")
    created = 0
    updated = 0
    for item in data:
        existing = await db.execute(
            select(SightWord).where(SightWord.word == item["word"])
        )
        word = existing.scalar_one_or_none()
        values = {
            "word": item["word"],
            "phase": item["phase"],
            "part_number": item["part_number"],
            "dolch_list": item["dolch_list"],
            "fry_rank": item.get("fry_rank"),
        }
        if word is not None:
            if _apply_values(word, values):
                updated += 1
            continue

        db.add(SightWord(**values))
        created += 1

    await db.flush()
    print(f"  Sight words: {created} new, {updated} updated / {len(data)} total")


async def _seed_sentence_patterns(db: AsyncSession) -> None:
    data = _load_json("sentence_patterns.json")
    desired = sorted([
        (
            item["month"],
            item["pattern_type"],
            item["template"],
            item["example_sentence"],
            item["word_blocks"],
            item["correct_order"],
        )
        for item in data
    ], key=lambda item: (item[0], item[1], item[3]))
    existing_result = await db.execute(
        select(SentencePattern).order_by(
            SentencePattern.month,
            SentencePattern.pattern_type,
            SentencePattern.example_sentence,
        )
    )
    existing_patterns = list(existing_result.scalars().all())
    existing = [
        (
            item.month,
            item.pattern_type,
            item.template,
            item.example_sentence,
            item.word_blocks,
            item.correct_order,
        )
        for item in existing_patterns
    ]

    if existing == desired:
        print(f"  Sentence patterns: 0 replaced / {len(data)} total")
        return

    await db.execute(delete(SentencePattern))
    for item in data:
        db.add(SentencePattern(
            pattern_type=item["pattern_type"],
            month=item["month"],
            template=item["template"],
            example_sentence=item["example_sentence"],
            word_blocks=item["word_blocks"],
            correct_order=item["correct_order"],
        ))

    await db.flush()
    print(f"  Sentence patterns: {len(data)} replaced / {len(data)} total")


async def _seed_lessons(db: AsyncSession, phase_map: dict[int, int]) -> None:
    data = _load_json("lessons.json")
    created = 0
    updated = 0
    for item in data:
        phase_id = phase_map.get(item["phase_number"])
        if phase_id is None:
            continue

        existing = await db.execute(
            select(Lesson).where(
                Lesson.phase_id == phase_id,
                Lesson.month == item["month"],
                Lesson.order_index == item["order_index"],
            )
        )
        lesson = existing.scalar_one_or_none()
        values = {
            "phase_id": phase_id,
            "lesson_type": item["lesson_type"],
            "month": item["month"],
            "order_index": item["order_index"],
            "title": item["title"],
            "title_ko": item["title_ko"],
            "description": item.get("description"),
            "phonics_level": item.get("phonics_level"),
            "sight_word_phase": item.get("sight_word_phase"),
            "xp_reward": item["xp_reward"],
            "is_active": item.get("is_active", True),
        }
        if lesson is not None:
            if _apply_values(lesson, values):
                updated += 1
            continue

        db.add(Lesson(**values))
        created += 1

    await db.flush()
    print(f"  Lessons: {created} new, {updated} updated / {len(data)} total")


async def _seed_lesson_items(db: AsyncSession) -> None:
    """Seed lesson items by matching months to lessons."""
    data = _load_json("lesson_items.json")
    ext_data = _load_json("lesson_items_extended.json")
    total_count = 0
    replaced_lessons = 0
    skipped_lessons = 0

    # Merge extended data into base data
    for section in ["sight_word_lesson_items", "sentence_lesson_items"]:
        if section not in data:
            data[section] = {}
        for month_key, items in ext_data.get(section, {}).items():
            if month_key not in data[section]:
                data[section][month_key] = items

    # Build month→lesson mapping
    lessons_result = await db.execute(
        select(Lesson).order_by(Lesson.month, Lesson.order_index)
    )
    lessons = list(lessons_result.scalars().all())
    month_type_map: dict[tuple[int, str], Lesson] = {}
    for lesson in lessons:
        key = (lesson.month, lesson.lesson_type.value)
        month_type_map[key] = lesson

    # Phonics items
    for month_key, items in data.get("phonics_lesson_items", {}).items():
        month_num = int(month_key.replace("month_", ""))
        lesson = month_type_map.get((month_num, "phonics"))
        if lesson is None:
            continue

        existing_result = await db.execute(
            select(LessonItem)
            .where(LessonItem.lesson_id == lesson.id)
            .order_by(LessonItem.order_index)
        )
        existing_items = list(existing_result.scalars().all())
        if (
            [_lesson_item_signature(item) for item in existing_items]
            == [_lesson_item_seed_signature(item) for item in items]
        ):
            skipped_lessons += 1
            continue

        await db.execute(delete(LessonItem).where(LessonItem.lesson_id == lesson.id))
        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1
        replaced_lessons += 1

    # Sight word items
    for month_key, items in data.get("sight_word_lesson_items", {}).items():
        month_num = int(month_key.replace("month_", ""))
        lesson = month_type_map.get((month_num, "sight_words"))
        if lesson is None:
            continue

        existing_result = await db.execute(
            select(LessonItem)
            .where(LessonItem.lesson_id == lesson.id)
            .order_by(LessonItem.order_index)
        )
        existing_items = list(existing_result.scalars().all())
        if (
            [_lesson_item_signature(item) for item in existing_items]
            == [_lesson_item_seed_signature(item) for item in items]
        ):
            skipped_lessons += 1
            continue

        await db.execute(delete(LessonItem).where(LessonItem.lesson_id == lesson.id))
        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1
        replaced_lessons += 1

    # Sentence items
    for month_key, items in data.get("sentence_lesson_items", {}).items():
        month_num = int(month_key.replace("month_", ""))
        lesson = month_type_map.get((month_num, "sentences"))
        if lesson is None:
            continue

        existing_result = await db.execute(
            select(LessonItem)
            .where(LessonItem.lesson_id == lesson.id)
            .order_by(LessonItem.order_index)
        )
        existing_items = list(existing_result.scalars().all())
        if (
            [_lesson_item_signature(item) for item in existing_items]
            == [_lesson_item_seed_signature(item) for item in items]
        ):
            skipped_lessons += 1
            continue

        await db.execute(delete(LessonItem).where(LessonItem.lesson_id == lesson.id))
        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1
        replaced_lessons += 1

    await db.flush()
    print(
        "  Lesson items: "
        f"{total_count} written across {replaced_lessons} lessons, "
        f"{skipped_lessons} unchanged"
    )


async def _seed_stories(db: AsyncSession) -> None:
    """Seed stories with pages and quizzes."""
    data = _load_json("stories.json")
    created = 0
    updated = 0
    children_replaced = 0

    for item in data:
        existing = await db.execute(
            select(Story).where(Story.title == item["title"])
        )
        story = existing.scalar_one_or_none()
        values = {
            "title": item["title"],
            "author": item.get("author"),
            "genre": item["genre"],
            "lexile_min": item["lexile_min"],
            "lexile_max": item["lexile_max"],
            "page_count": len(item["pages"]),
            "target_month": item["target_month"],
            "is_fiction": item["is_fiction"],
            "is_active": item.get("is_active", True),
        }
        if "cover_image_url" in item:
            values["cover_image_url"] = item.get("cover_image_url")

        if story is None:
            story = Story(**values)
            db.add(story)
            await db.flush()
            created += 1
        elif _apply_values(story, values):
            updated += 1

        pages_result = await db.execute(
            select(StoryPage)
            .where(StoryPage.story_id == story.id)
            .order_by(StoryPage.page_number)
        )
        existing_pages = list(pages_result.scalars().all())
        quizzes_result = await db.execute(
            select(StoryQuiz).where(StoryQuiz.story_id == story.id)
        )
        existing_quizzes = list(quizzes_result.scalars().all())

        page_changed = (
            [_story_page_signature(page) for page in existing_pages]
            != [_story_page_seed_signature(page) for page in item["pages"]]
        )
        quiz_changed = (
            [_story_quiz_signature(quiz) for quiz in existing_quizzes]
            != [_story_quiz_seed_signature(quiz) for quiz in item.get("quizzes", [])]
        )

        if page_changed:
            await db.execute(delete(StoryPage).where(StoryPage.story_id == story.id))
            for page in item["pages"]:
                db.add(StoryPage(
                    story_id=story.id,
                    page_number=page["page_number"],
                    text_content=page["text_content"],
                    words_data=page["words_data"],
                ))

        if quiz_changed:
            await db.execute(delete(StoryQuiz).where(StoryQuiz.story_id == story.id))
            for quiz in item.get("quizzes", []):
                db.add(StoryQuiz(
                    story_id=story.id,
                    question_type=quiz["question_type"],
                    question_text=quiz["question_text"],
                    choices=quiz["choices"],
                    correct_index=quiz["correct_index"],
                ))

        if page_changed or quiz_changed:
            children_replaced += 1

    await db.flush()
    total_pages = sum(len(s["pages"]) for s in data)
    total_quizzes = sum(len(s.get("quizzes", [])) for s in data)
    print(
        "  Stories: "
        f"{created} new, {updated} updated, {children_replaced} page/quiz sets replaced "
        f"/ {len(data)} total ({total_pages} pages, {total_quizzes} quizzes)"
    )


async def _seed_characters(db: AsyncSession) -> None:
    data = _load_json("characters.json")
    created = 0
    updated = 0
    for item in data:
        existing = await db.execute(
            select(Character).where(Character.name == item["name"])
        )
        character = existing.scalar_one_or_none()
        values = {
            "name": item["name"],
            "name_ko": item["name_ko"],
            "description": item.get("description"),
            "rarity": item["rarity"],
            "linked_lesson_type": item.get("linked_lesson_type"),
            "linked_rule": item.get("linked_rule"),
            "phase_number": item["phase_number"],
        }
        if "image_url_locked" in item:
            values["image_url_locked"] = item.get("image_url_locked")
        if "image_url_unlocked" in item:
            values["image_url_unlocked"] = item.get("image_url_unlocked")
        if character is not None:
            if _apply_values(character, values):
                updated += 1
            continue

        db.add(Character(**values))
        created += 1

    await db.flush()
    print(f"  Characters: {created} new, {updated} updated / {len(data)} total")


async def _seed_gamification(db: AsyncSession) -> None:
    data = _load_json("gamification.json")

    # Badges
    badges = data["badges"]
    badge_created = 0
    badge_updated = 0
    for item in badges:
        existing = await db.execute(
            select(Badge).where(Badge.code == item["code"])
        )
        badge = existing.scalar_one_or_none()
        values = {
            "code": item["code"],
            "name": item["name"],
            "name_ko": item["name_ko"],
            "description": item.get("description"),
            "condition_type": item["condition_type"],
            "condition_value": item["condition_value"],
            "reward_coins": item.get("reward_coins", 10),
        }
        if "image_url" in item:
            values["image_url"] = item.get("image_url")
        if badge is not None:
            if _apply_values(badge, values):
                badge_updated += 1
            continue

        db.add(Badge(**values))
        badge_created += 1

    await db.flush()
    print(f"  Badges: {badge_created} new, {badge_updated} updated / {len(badges)} total")

    # Shop items
    shop_items = data["shop_items"]
    shop_created = 0
    shop_updated = 0
    for item in shop_items:
        existing = await db.execute(
            select(ShopItem).where(
                ShopItem.name == item["name"],
                ShopItem.category == item["category"],
            )
        )
        shop_item = existing.scalar_one_or_none()
        values = {
            "category": item["category"],
            "name": item["name"],
            "name_ko": item["name_ko"],
            "price_coins": item["price_coins"],
            "is_active": item.get("is_active", True),
        }
        if "image_url" in item:
            values["image_url"] = item.get("image_url")
        if "item_data" in item:
            values["item_data"] = item.get("item_data")
        if shop_item is not None:
            if _apply_values(shop_item, values):
                shop_updated += 1
            continue

        db.add(ShopItem(**values))
        shop_created += 1

    await db.flush()
    print(
        f"  Shop items: {shop_created} new, {shop_updated} updated "
        f"/ {len(shop_items)} total"
    )

    # Conversation scenarios
    scenarios = data["conversation_scenarios"]
    scenario_created = 0
    scenario_updated = 0
    for item in scenarios:
        existing = await db.execute(
            select(ConversationScenario).where(
                ConversationScenario.title == item["title"]
            )
        )
        scenario = existing.scalar_one_or_none()
        if scenario is None:
            existing = await db.execute(
                select(ConversationScenario).where(
                    ConversationScenario.target_month == item["target_month"]
                )
            )
            scenario = existing.scalar_one_or_none()
        values = {
            "title": item["title"],
            "title_ko": item["title_ko"],
            "description": item.get("description"),
            "target_month": item["target_month"],
            "character_name": item["character_name"],
            "system_prompt_template": item["system_prompt_template"],
            "allowed_vocabulary": item["allowed_vocabulary"],
            "max_sentence_words": item["max_sentence_words"],
            "starter_messages": item["starter_messages"],
            "llm_tier": LLMTier(item["llm_tier"]),
            "is_active": item.get("is_active", True),
        }
        if "character_image_url" in item:
            values["character_image_url"] = item.get("character_image_url")
        if scenario is not None:
            if _apply_values(scenario, values):
                scenario_updated += 1
            continue

        db.add(ConversationScenario(**values))
        scenario_created += 1

    await db.flush()
    print(
        f"  Scenarios: {scenario_created} new, {scenario_updated} updated "
        f"/ {len(scenarios)} total"
    )


async def seed_all(reset: bool = False) -> None:
    print(f"Database: {settings.db_host}:{settings.db_port}/{settings.db_name}")

    if reset:
        print("Resetting database (drop + create all tables)...")
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)
        print("Tables recreated.")
    else:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

    print("Seeding data...")
    async with async_session_factory() as db:
        try:
            phase_map = await _seed_phases(db)
            await _seed_phonics_words(db)
            await _seed_sight_words(db)
            await _seed_sentence_patterns(db)
            await _seed_lessons(db, phase_map)
            await _seed_lesson_items(db)
            await _seed_stories(db)
            await _seed_characters(db)
            await _seed_gamification(db)
            await db.commit()
            print("Seed complete.")
        except Exception as e:
            await db.rollback()
            print(f"Seed failed: {e}")
            raise

    await engine.dispose()


if __name__ == "__main__":
    reset_flag = "--reset" in sys.argv
    asyncio.run(seed_all(reset=reset_flag))
