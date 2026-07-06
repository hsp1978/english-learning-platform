from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.tuning import get_tuning
from app.models.models import LessonType, SpacedRepetitionItem

settings = get_settings()

_LESSON_ITEM_TYPES = {
    LessonType.PHONICS: "phonics_word",
    LessonType.SIGHT_WORDS: "sight_word",
    LessonType.SENTENCES: "sentence",
}

_MAX_SEED_ITEMS = 20
_MAX_ITEM_KEY_LENGTH = 100


def _calculate_next_review(
    ease_factor: float,
    interval_days: int,
    repetitions: int,
    score: int,
    group: str = "control",
) -> tuple[float, int, int]:
    """
    SM-2 algorithm variant for children.
    Parameters loaded from tuning.json based on AB test group.

    score: 0-5
      0-2 = incorrect (reset)
      3   = hard (barely correct)
      4   = normal
      5   = easy
    """
    tuning = get_tuning()
    sr = tuning.spaced_repetition(group)
    min_ease = sr.get("min_ease_factor", 1.3)
    max_interval = sr.get("max_interval_days", 14)
    interval_first = sr.get("interval_after_first_correct", 1)
    interval_second = sr.get("interval_after_second_correct", 3)
    reset_interval = sr.get("reset_interval_on_wrong", 1)

    if score < 3:
        return ease_factor, reset_interval, 0

    new_reps = repetitions + 1

    if new_reps == 1:
        new_interval = interval_first
    elif new_reps == 2:
        new_interval = interval_second
    else:
        new_interval = round(interval_days * ease_factor)

    new_interval = min(new_interval, max_interval)

    new_ease = max(
        min_ease,
        ease_factor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)),
    )

    return new_ease, new_interval, new_reps


async def get_items_due_for_review(
    db: AsyncSession,
    child_id: uuid.UUID,
    limit: int = 20,
) -> list[SpacedRepetitionItem]:
    now = datetime.now(timezone.utc)
    stmt = (
        select(SpacedRepetitionItem)
        .where(
            SpacedRepetitionItem.child_id == child_id,
            SpacedRepetitionItem.next_review <= now,
        )
        .order_by(SpacedRepetitionItem.next_review.asc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def record_review(
    db: AsyncSession,
    child_id: uuid.UUID,
    item_type: str,
    item_key: str,
    score: int,
    group: str = "control",
) -> SpacedRepetitionItem:
    stmt = select(SpacedRepetitionItem).where(
        SpacedRepetitionItem.child_id == child_id,
        SpacedRepetitionItem.item_type == item_type,
        SpacedRepetitionItem.item_key == item_key,
    )
    result = await db.execute(stmt)
    item: Optional[SpacedRepetitionItem] = result.scalar_one_or_none()

    tuning = get_tuning()
    sr = tuning.spaced_repetition(group)
    initial_ease = sr.get("initial_ease_factor", 2.5)

    now = datetime.now(timezone.utc)

    if item is None:
        new_ease, new_interval, new_reps = _calculate_next_review(
            initial_ease, 0, 0, score, group=group
        )
        item = SpacedRepetitionItem(
            child_id=child_id,
            item_type=item_type,
            item_key=item_key,
            ease_factor=new_ease,
            interval_days=new_interval,
            repetitions=new_reps,
            next_review=now + timedelta(days=new_interval),
            last_reviewed=now,
        )
        db.add(item)
    else:
        new_ease, new_interval, new_reps = _calculate_next_review(
            item.ease_factor,
            item.interval_days,
            item.repetitions,
            score,
            group=group,
        )
        item.ease_factor = new_ease
        item.interval_days = new_interval
        item.repetitions = new_reps
        item.next_review = now + timedelta(days=new_interval)
        item.last_reviewed = now

    return item


def _clean_item_keys(raw: object) -> list[str]:
    if not isinstance(raw, list):
        return []
    keys: list[str] = []
    seen: set[str] = set()
    for value in raw:
        if not isinstance(value, str):
            continue
        key = value.strip()
        if not key or len(key) > _MAX_ITEM_KEY_LENGTH or key in seen:
            continue
        seen.add(key)
        keys.append(key)
        if len(keys) >= _MAX_SEED_ITEMS:
            break
    return keys


async def seed_review_items_from_lesson(
    db: AsyncSession,
    child_id: uuid.UUID,
    lesson_type: LessonType,
    detail_data: dict | None,
    group: str = "control",
) -> int:
    """
    Feed lesson results into the spaced-repetition queue.

    Wrong items are always upserted (score 2 → reviewed again soon).
    Correct items only advance entries already in the queue, so words the
    child already knows don't flood the review deck.
    """
    item_type = _LESSON_ITEM_TYPES.get(lesson_type)
    if item_type is None or not detail_data:
        return 0

    wrong_keys = _clean_item_keys(detail_data.get("wrong_items"))
    correct_keys = _clean_item_keys(detail_data.get("correct_items"))
    correct_keys = [k for k in correct_keys if k not in set(wrong_keys)]

    for key in wrong_keys:
        await record_review(db, child_id, item_type, key, score=2, group=group)

    if correct_keys:
        stmt = select(SpacedRepetitionItem.item_key).where(
            SpacedRepetitionItem.child_id == child_id,
            SpacedRepetitionItem.item_type == item_type,
            SpacedRepetitionItem.item_key.in_(correct_keys),
        )
        result = await db.execute(stmt)
        existing_keys = set(result.scalars().all())
        for key in existing_keys:
            await record_review(db, child_id, item_type, key, score=4, group=group)

    return len(wrong_keys)
