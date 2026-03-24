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

from sqlalchemy import select, text
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


async def _seed_phases(db: AsyncSession) -> dict[int, int]:
    """Seed curriculum phases. Returns {phase_number: phase_id}."""
    data = _load_json("phases.json")
    mapping: dict[int, int] = {}

    for i, item in enumerate(data, start=1):
        existing = await db.execute(
            select(CurriculumPhase).where(
                CurriculumPhase.phase_number == item["phase_number"]
            )
        )
        if existing.scalar_one_or_none() is not None:
            mapping[item["phase_number"]] = i
            continue

        phase = CurriculumPhase(
            id=i,
            phase_number=item["phase_number"],
            title=item["title"],
            title_ko=item["title_ko"],
            description=item["description"],
            start_month=item["start_month"],
            end_month=item["end_month"],
        )
        db.add(phase)
        mapping[item["phase_number"]] = i

    await db.flush()
    print(f"  Phases: {len(data)} records")
    return mapping


async def _seed_phonics_words(db: AsyncSession) -> None:
    data = _load_json("phonics_words.json")
    count = 0
    for item in data:
        existing = await db.execute(
            select(PhonicsWord).where(PhonicsWord.word == item["word"])
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(PhonicsWord(
            word=item["word"],
            phonemes=item["phonemes"],
            phonics_level=item["phonics_level"],
            pattern=item["pattern"],
        ))
        count += 1

    await db.flush()
    print(f"  Phonics words: {count} new / {len(data)} total")


async def _seed_sight_words(db: AsyncSession) -> None:
    data = _load_json("sight_words.json")
    count = 0
    for item in data:
        existing = await db.execute(
            select(SightWord).where(SightWord.word == item["word"])
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(SightWord(
            word=item["word"],
            phase=item["phase"],
            part_number=item["part_number"],
            dolch_list=item["dolch_list"],
            fry_rank=item.get("fry_rank"),
        ))
        count += 1

    await db.flush()
    print(f"  Sight words: {count} new / {len(data)} total")


async def _seed_sentence_patterns(db: AsyncSession) -> None:
    data = _load_json("sentence_patterns.json")
    count = 0
    for item in data:
        existing = await db.execute(
            select(SentencePattern).where(
                SentencePattern.example_sentence == item["example_sentence"]
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(SentencePattern(
            pattern_type=item["pattern_type"],
            month=item["month"],
            template=item["template"],
            example_sentence=item["example_sentence"],
            word_blocks=item["word_blocks"],
            correct_order=item["correct_order"],
        ))
        count += 1

    await db.flush()
    print(f"  Sentence patterns: {count} new / {len(data)} total")


async def _seed_lessons(db: AsyncSession, phase_map: dict[int, int]) -> None:
    data = _load_json("lessons.json")
    count = 0
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
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(Lesson(
            phase_id=phase_id,
            lesson_type=item["lesson_type"],
            month=item["month"],
            order_index=item["order_index"],
            title=item["title"],
            title_ko=item["title_ko"],
            phonics_level=item.get("phonics_level"),
            sight_word_phase=item.get("sight_word_phase"),
            xp_reward=item["xp_reward"],
        ))
        count += 1

    await db.flush()
    print(f"  Lessons: {count} new / {len(data)} total")


async def _seed_lesson_items(db: AsyncSession) -> None:
    """Seed lesson items by matching months to lessons."""
    data = _load_json("lesson_items.json")
    ext_data = _load_json("lesson_items_extended.json")
    total_count = 0

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

        existing = await db.execute(
            select(LessonItem).where(LessonItem.lesson_id == lesson.id).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1

    # Sight word items
    for month_key, items in data.get("sight_word_lesson_items", {}).items():
        month_num = int(month_key.replace("month_", ""))
        lesson = month_type_map.get((month_num, "sight_words"))
        if lesson is None:
            continue

        existing = await db.execute(
            select(LessonItem).where(LessonItem.lesson_id == lesson.id).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1

    # Sentence items
    for month_key, items in data.get("sentence_lesson_items", {}).items():
        month_num = int(month_key.replace("month_", ""))
        lesson = month_type_map.get((month_num, "sentences"))
        if lesson is None:
            continue

        existing = await db.execute(
            select(LessonItem).where(LessonItem.lesson_id == lesson.id).limit(1)
        )
        if existing.scalar_one_or_none() is not None:
            continue

        for item in items:
            db.add(LessonItem(
                lesson_id=lesson.id,
                order_index=item["order_index"],
                content_type=item["content_type"],
                content_data=item["content_data"],
            ))
            total_count += 1

    await db.flush()
    print(f"  Lesson items: {total_count} new")


async def _seed_stories(db: AsyncSession) -> None:
    """Seed stories with pages and quizzes."""
    data = _load_json("stories.json")
    count = 0

    for item in data:
        existing = await db.execute(
            select(Story).where(Story.title == item["title"])
        )
        if existing.scalar_one_or_none() is not None:
            continue

        story = Story(
            title=item["title"],
            author=item.get("author"),
            genre=item["genre"],
            lexile_min=item["lexile_min"],
            lexile_max=item["lexile_max"],
            page_count=len(item["pages"]),
            target_month=item["target_month"],
            is_fiction=item["is_fiction"],
        )
        db.add(story)
        await db.flush()

        for page in item["pages"]:
            db.add(StoryPage(
                story_id=story.id,
                page_number=page["page_number"],
                text_content=page["text_content"],
                words_data=page["words_data"],
            ))

        for quiz in item.get("quizzes", []):
            db.add(StoryQuiz(
                story_id=story.id,
                question_type=quiz["question_type"],
                question_text=quiz["question_text"],
                choices=quiz["choices"],
                correct_index=quiz["correct_index"],
            ))

        count += 1

    await db.flush()
    total_pages = sum(len(s["pages"]) for s in data)
    total_quizzes = sum(len(s.get("quizzes", [])) for s in data)
    print(f"  Stories: {count} new / {len(data)} total ({total_pages} pages, {total_quizzes} quizzes)")


async def _seed_characters(db: AsyncSession) -> None:
    data = _load_json("characters.json")
    count = 0
    for item in data:
        existing = await db.execute(
            select(Character).where(Character.name == item["name"])
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(Character(
            name=item["name"],
            name_ko=item["name_ko"],
            description=item.get("description"),
            rarity=item["rarity"],
            linked_lesson_type=item.get("linked_lesson_type"),
            linked_rule=item.get("linked_rule"),
            phase_number=item["phase_number"],
        ))
        count += 1

    await db.flush()
    print(f"  Characters: {count} new / {len(data)} total")


async def _seed_gamification(db: AsyncSession) -> None:
    data = _load_json("gamification.json")

    # Badges
    badges = data["badges"]
    badge_count = 0
    for item in badges:
        existing = await db.execute(
            select(Badge).where(Badge.code == item["code"])
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(Badge(
            code=item["code"],
            name=item["name"],
            name_ko=item["name_ko"],
            description=item.get("description"),
            condition_type=item["condition_type"],
            condition_value=item["condition_value"],
        ))
        badge_count += 1

    await db.flush()
    print(f"  Badges: {badge_count} new / {len(badges)} total")

    # Shop items
    shop_items = data["shop_items"]
    shop_count = 0
    for item in shop_items:
        existing = await db.execute(
            select(ShopItem).where(
                ShopItem.name == item["name"],
                ShopItem.category == item["category"],
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(ShopItem(
            category=item["category"],
            name=item["name"],
            name_ko=item["name_ko"],
            price_coins=item["price_coins"],
        ))
        shop_count += 1

    await db.flush()
    print(f"  Shop items: {shop_count} new / {len(shop_items)} total")

    # Conversation scenarios
    scenarios = data["conversation_scenarios"]
    scenario_count = 0
    for item in scenarios:
        existing = await db.execute(
            select(ConversationScenario).where(
                ConversationScenario.title == item["title"]
            )
        )
        if existing.scalar_one_or_none() is not None:
            continue

        db.add(ConversationScenario(
            title=item["title"],
            title_ko=item["title_ko"],
            description=item.get("description"),
            target_month=item["target_month"],
            character_name=item["character_name"],
            system_prompt_template=item["system_prompt_template"],
            allowed_vocabulary=item["allowed_vocabulary"],
            max_sentence_words=item["max_sentence_words"],
            starter_messages=item["starter_messages"],
            llm_tier=LLMTier(item["llm_tier"]),
        ))
        scenario_count += 1

    await db.flush()
    print(f"  Scenarios: {scenario_count} new / {len(scenarios)} total")


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
