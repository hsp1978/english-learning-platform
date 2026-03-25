"""
Migration script: Convert grammar-focused SENTENCES lessons to pattern-based lessons

Usage:
    python -m app.scripts.migrate_pattern_lessons

This script transforms existing SENTENCES lessons from grammar terminology
to age-appropriate pattern repetition for 6-8 year old learners.
"""
from __future__ import annotations

import asyncio
import uuid
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_factory
from app.models.models import Lesson, LessonItem


# Pattern lesson definitions
PATTERN_LESSONS = {
    # Month 1
    "5b0cd1fc-748a-422d-b9a3-ec3c887bd001": {
        "new_title": "I see a ___",
        "new_title_ko": "나는 ___를 봐요",
        "new_description": "Pattern: I see a ___ (사물 가리키며 말하기)",
        "items": [
            {
                "pattern": "I see a ___",
                "target_word": "cat",
                "complete_sentence": "I see a cat",
                "category": "animal",
                "image": "cat.png",
            },
            {
                "pattern": "I see a ___",
                "target_word": "dog",
                "complete_sentence": "I see a dog",
                "category": "animal",
                "image": "dog.png",
            },
            {
                "pattern": "I see a ___",
                "target_word": "ball",
                "complete_sentence": "I see a ball",
                "category": "toy",
                "image": "ball.png",
            },
            {
                "pattern": "I see a ___",
                "target_word": "bed",
                "complete_sentence": "I see a bed",
                "category": "furniture",
                "image": "bed.png",
            },
            {
                "pattern": "I see the ___",
                "target_word": "sun",
                "complete_sentence": "I see the sun",
                "category": "nature",
                "image": "sun.png",
            },
        ],
    },
    # Month 2
    "22e1ace9-91c9-4c7f-812e-dbb5b65f95d6": {
        "new_title": "My name is ___",
        "new_title_ko": "내 이름은 ___",
        "new_description": "Pattern: My name is ___ (자기소개 하기)",
        "items": [
            {
                "pattern": "My name is ___",
                "target_word": "Mia",
                "complete_sentence": "My name is Mia",
                "category": "self-introduction",
                "context": "self",
            },
            {
                "pattern": "His name is ___",
                "target_word": "Tom",
                "complete_sentence": "His name is Tom",
                "category": "self-introduction",
                "context": "brother",
            },
            {
                "pattern": "Her name is ___",
                "target_word": "Lily",
                "complete_sentence": "Her name is Lily",
                "category": "self-introduction",
                "context": "sister",
            },
            {
                "pattern": "My friend is ___",
                "target_word": "Sam",
                "complete_sentence": "My friend is Sam",
                "category": "self-introduction",
                "context": "friend",
            },
            {
                "pattern": "This is ___",
                "target_word": "Mom",
                "complete_sentence": "This is Mom",
                "category": "self-introduction",
                "context": "family",
            },
        ],
    },
    # Month 3
    "27a073e0-676b-4f5b-a1a2-7022bbfacf54": {
        "new_title": "This is ___",
        "new_title_ko": "이것은 ___입니다",
        "new_description": "Pattern: This is ___ (사물 소개하기)",
        "items": [
            {
                "pattern": "This is ___",
                "target_word": "my bag",
                "complete_sentence": "This is my bag",
                "category": "possession",
                "image": "bag.png",
            },
            {
                "pattern": "This is ___",
                "target_word": "my book",
                "complete_sentence": "This is my book",
                "category": "possession",
                "image": "book.png",
            },
            {
                "pattern": "This is ___",
                "target_word": "a pencil",
                "complete_sentence": "This is a pencil",
                "category": "school",
                "image": "pencil.png",
            },
            {
                "pattern": "This is ___",
                "target_word": "a cat",
                "complete_sentence": "This is a cat",
                "category": "animal",
                "image": "cat.png",
            },
            {
                "pattern": "That is ___",
                "target_word": "a car",
                "complete_sentence": "That is a car",
                "category": "vehicle",
                "image": "car.png",
            },
        ],
    },
    # Month 4
    "825a962e-1e47-4097-8b40-e000da96fc32": {
        "new_title": "I like ___",
        "new_title_ko": "나는 ___를 좋아해요",
        "new_description": "Pattern: I like ___ (선호 표현하기)",
        "items": [
            {
                "pattern": "I like ___",
                "target_word": "apples",
                "complete_sentence": "I like apples",
                "category": "food",
                "image": "apples.png",
            },
            {
                "pattern": "I like ___",
                "target_word": "pizza",
                "complete_sentence": "I like pizza",
                "category": "food",
                "image": "pizza.png",
            },
            {
                "pattern": "I like ___",
                "target_word": "dogs",
                "complete_sentence": "I like dogs",
                "category": "animals",
                "image": "dogs.png",
            },
            {
                "pattern": "I like ___",
                "target_word": "blue",
                "complete_sentence": "I like blue",
                "category": "colors",
                "image": "blue_color.png",
            },
            {
                "pattern": "I don't like ___",
                "target_word": "bugs",
                "complete_sentence": "I don't like bugs",
                "category": "animals",
                "image": "bugs.png",
            },
        ],
    },
    # Month 5
    "5aa2e2d0-91e2-4e80-a6b9-5182576d9241": {
        "new_title": "The ___ is big/small",
        "new_title_ko": "___는 커요/작아요",
        "new_description": "Pattern: The ___ is ___ (형용사로 설명하기)",
        "items": [
            {
                "pattern": "The ___ is ___",
                "subject": "elephant",
                "adjective": "big",
                "complete_sentence": "The elephant is big",
                "opposite": "The mouse is small",
                "category": "size",
                "image": "elephant.png",
            },
            {
                "pattern": "The ___ is ___",
                "subject": "ball",
                "adjective": "red",
                "complete_sentence": "The ball is red",
                "opposite": "The grass is green",
                "category": "color",
                "image": "red_ball.png",
            },
            {
                "pattern": "The ___ is ___",
                "subject": "flower",
                "adjective": "pretty",
                "complete_sentence": "The flower is pretty",
                "opposite": "The rose is beautiful",
                "category": "appearance",
                "image": "flower.png",
            },
            {
                "pattern": "The ___ is ___",
                "subject": "ice",
                "adjective": "cold",
                "complete_sentence": "The ice is cold",
                "opposite": "The sun is hot",
                "category": "temperature",
                "image": "ice.png",
            },
        ],
    },
    # Month 6
    "eaf45ef9-21d4-4c4d-88c2-7376e1f5f5dc": {
        "new_title": "My ___ is ___",
        "new_title_ko": "내 ___는 ___입니다",
        "new_description": "Pattern: My ___ is ___ (소유물 설명하기)",
        "items": [
            {
                "pattern": "My ___ is ___",
                "noun": "bag",
                "adjective": "red",
                "complete_sentence": "My bag is red",
                "category": "possession",
                "image": "red_bag.png",
            },
            {
                "pattern": "Your ___ is ___",
                "noun": "book",
                "adjective": "blue",
                "complete_sentence": "Your book is blue",
                "category": "possession",
                "image": "blue_book.png",
            },
            {
                "pattern": "His ___ is ___",
                "noun": "car",
                "adjective": "fast",
                "complete_sentence": "His car is fast",
                "category": "possession",
                "image": "fast_car.png",
            },
            {
                "pattern": "Her ___ is ___",
                "noun": "doll",
                "adjective": "pretty",
                "complete_sentence": "Her doll is pretty",
                "category": "possession",
                "image": "pretty_doll.png",
            },
        ],
    },
    # Month 7
    "3dcf74cd-a64d-4478-82fb-9de89c2b23ec": {
        "new_title": "Where is the ___?",
        "new_title_ko": "___는 어디 있나요?",
        "new_description": "Pattern: Where is the ___? (위치 묻기)",
        "items": [
            {
                "question": "Where is the ___?",
                "target_word": "ball",
                "answer": "Under the bed",
                "complete_qa": "Where is the ball? - Under the bed.",
                "preposition": "under",
                "image": "ball_under_bed.png",
            },
            {
                "question": "Where is the ___?",
                "target_word": "cat",
                "answer": "In the box",
                "complete_qa": "Where is the cat? - In the box.",
                "preposition": "in",
                "image": "cat_in_box.png",
            },
            {
                "question": "Where is the ___?",
                "target_word": "book",
                "answer": "On the table",
                "complete_qa": "Where is the book? - On the table.",
                "preposition": "on",
                "image": "book_on_table.png",
            },
            {
                "question": "Where is the ___?",
                "target_word": "dog",
                "answer": "Behind the door",
                "complete_qa": "Where is the dog? - Behind the door.",
                "preposition": "behind",
                "image": "dog_behind_door.png",
            },
            {
                "question": "Where is the ___?",
                "target_word": "toy",
                "answer": "Next to the chair",
                "complete_qa": "Where is the toy? - Next to the chair.",
                "preposition": "next to",
                "image": "toy_next_to_chair.png",
            },
        ],
    },
    # Month 8
    "a313c665-ba30-4a7d-934f-57224f3a974f": {
        "new_title": "The cat is ___ the box",
        "new_title_ko": "고양이는 상자 ___에 있어요",
        "new_description": "Pattern: The ___ is ___ the ___ (위치 설명하기)",
        "items": [
            {
                "pattern": "The ___ is ___ the ___",
                "subject": "cat",
                "preposition": "in",
                "object": "box",
                "complete_sentence": "The cat is in the box",
                "image": "cat_in_box.png",
            },
            {
                "pattern": "The ___ is ___ the ___",
                "subject": "cat",
                "preposition": "on",
                "object": "table",
                "complete_sentence": "The cat is on the table",
                "image": "cat_on_table.png",
            },
            {
                "pattern": "The ___ is ___ the ___",
                "subject": "cat",
                "preposition": "under",
                "object": "bed",
                "complete_sentence": "The cat is under the bed",
                "image": "cat_under_bed.png",
            },
            {
                "pattern": "The ___ is ___ the ___",
                "subject": "cat",
                "preposition": "behind",
                "object": "door",
                "complete_sentence": "The cat is behind the door",
                "image": "cat_behind_door.png",
            },
        ],
    },
    # Month 9
    "472204a7-88cc-4522-9182-93158ed6f99a": {
        "new_title": "I run fast",
        "new_title_ko": "나는 빨리 달려요",
        "new_description": "Pattern: I ___ ___ (동작 설명하기)",
        "items": [
            {
                "pattern": "I ___ ___",
                "verb": "run",
                "adverb": "fast",
                "complete_sentence": "I run fast",
                "opposite": "I walk slowly",
                "category": "movement",
                "image": "running.png",
            },
            {
                "pattern": "I ___ ___",
                "verb": "sing",
                "adverb": "loudly",
                "complete_sentence": "I sing loudly",
                "opposite": "I whisper quietly",
                "category": "sound",
                "image": "singing.png",
            },
            {
                "pattern": "I ___ ___",
                "verb": "jump",
                "adverb": "high",
                "complete_sentence": "I jump high",
                "opposite": "I sit down",
                "category": "action",
                "image": "jumping.png",
            },
            {
                "pattern": "I ___ ___",
                "verb": "clap",
                "adverb": "happily",
                "complete_sentence": "I clap happily",
                "opposite": "I cry sadly",
                "category": "emotion",
                "image": "clapping.png",
            },
        ],
    },
    # Month 10
    "3a54a54b-dcaf-4cab-9a87-cd8459c9fea3": {
        "new_title": "I always eat breakfast",
        "new_title_ko": "나는 항상 아침을 먹어요",
        "new_description": "Pattern: I ___ ___ (일상 표현하기)",
        "items": [
            {
                "pattern": "I ___ ___",
                "frequency": "always",
                "activity": "eat breakfast",
                "complete_sentence": "I always eat breakfast",
                "category": "routine",
                "image": "breakfast.png",
            },
            {
                "pattern": "I ___ ___",
                "frequency": "often",
                "activity": "play outside",
                "complete_sentence": "I often play outside",
                "category": "routine",
                "image": "playing_outside.png",
            },
            {
                "pattern": "I ___ ___",
                "frequency": "sometimes",
                "activity": "watch TV",
                "complete_sentence": "I sometimes watch TV",
                "category": "routine",
                "image": "watching_tv.png",
            },
            {
                "pattern": "I ___ ___",
                "frequency": "never",
                "activity": "eat bugs",
                "complete_sentence": "I never eat bugs",
                "category": "routine",
                "image": "bugs.png",
            },
        ],
    },
}


async def migrate_lesson(session: AsyncSession, lesson_id: str, config: dict[str, Any]):
    """Migrate a single lesson from grammar to pattern-based"""
    print(f"  📝 Migrating lesson {lesson_id}...")

    # Update lesson metadata
    await session.execute(
        update(Lesson)
        .where(Lesson.id == lesson_id)
        .values(
            title=config["new_title"],
            title_ko=config["new_title_ko"],
            description=config.get("new_description"),
        )
    )

    # Delete old lesson items
    result = await session.execute(
        select(LessonItem).where(LessonItem.lesson_id == lesson_id)
    )
    old_items = result.scalars().all()
    for item in old_items:
        await session.delete(item)

    print(f"    🗑️  Deleted {len(old_items)} old items")

    # Create new pattern-based items
    for idx, item_data in enumerate(config["items"], start=1):
        new_item = LessonItem(
            id=str(uuid.uuid4()),
            lesson_id=lesson_id,
            order_index=idx,
            content_type="sentence_pattern",
            content_data=item_data,
        )
        session.add(new_item)

    print(f"    ✅ Created {len(config['items'])} pattern items")


async def main():
    """Main migration function"""
    print("\n🔄 Starting Pattern Lessons Migration")
    print("=" * 60)
    print("Converting grammar-focused lessons to pattern-based lessons")
    print("Target: 10 SENTENCES lessons (Month 1-10)")
    print("=" * 60)

    async with async_session_factory() as session:
        try:
            migrated_count = 0

            for lesson_id, config in PATTERN_LESSONS.items():
                await migrate_lesson(session, lesson_id, config)
                migrated_count += 1

            # Commit all changes
            await session.commit()

            print("\n" + "=" * 60)
            print(f"✅ Success! {migrated_count} lessons migrated to pattern-based")
            print("\nChanges:")
            print("  - Titles updated to pattern format")
            print("  - Content changed: grammar terminology → patterns")
            print("  - All lesson items replaced")
            print("  - Content type: sentence_pattern")
            print("=" * 60)

            # Show summary
            print("\n📊 Migration Summary:")
            print(f"  Total lessons: {migrated_count}")
            print(f"  Total items: {sum(len(c['items']) for c in PATTERN_LESSONS.values())}")
            print(f"  Average items per lesson: {sum(len(c['items']) for c in PATTERN_LESSONS.values()) / migrated_count:.1f}")
            print("\n✨ Next steps:")
            print("  1. Update frontend to handle 'sentence_pattern' content type")
            print("  2. Pre-generate TTS audio for all sentences")
            print("  3. Add images for pattern examples")
            print("  4. Test with children!")

        except Exception as e:
            print(f"\n❌ Error: {e}")
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(main())
