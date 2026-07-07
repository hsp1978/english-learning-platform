from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.tuning import get_tuning
from app.models.models import ChildProfile, LearningRecord, Lesson, LessonType

COMPLETION_SCORE_THRESHOLD = 0.6


def completion_attempt_filter():
    return or_(
        LearningRecord.total_items > 0,
        LearningRecord.lesson_type == LessonType.STORY,
    )


def score_to_xp(lesson: Lesson, score: float) -> int:
    if score >= COMPLETION_SCORE_THRESHOLD:
        return lesson.xp_reward
    return round(lesson.xp_reward * max(0.0, min(1.0, score)))


def calculate_xp_delta(lesson: Lesson, previous_best_score: float, new_score: float) -> int:
    previous_xp = score_to_xp(lesson, previous_best_score)
    new_xp = score_to_xp(lesson, new_score)
    return max(0, new_xp - previous_xp)


async def get_best_lesson_score(
    db: AsyncSession,
    child_id: uuid.UUID,
    lesson_id: uuid.UUID,
) -> float:
    result = await db.execute(
        select(func.max(LearningRecord.score)).where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_id == lesson_id,
            completion_attempt_filter(),
        )
    )
    return float(result.scalar_one_or_none() or 0.0)


async def get_completed_lesson_ids(
    db: AsyncSession,
    child_id: uuid.UUID,
) -> set[uuid.UUID]:
    result = await db.execute(
        select(LearningRecord.lesson_id)
        .where(
            LearningRecord.child_id == child_id,
            completion_attempt_filter(),
        )
        .group_by(LearningRecord.lesson_id)
        .having(func.max(LearningRecord.score) >= COMPLETION_SCORE_THRESHOLD)
    )
    return {row[0] for row in result}


async def maybe_advance_month(
    db: AsyncSession,
    child: ChildProfile,
    group: str = "control",
) -> int | None:
    """
    Advance the child to the next month once enough of the current month's
    lessons are completed (per tuning month_advancement). Completion already
    requires score >= COMPLETION_SCORE_THRESHOLD, which covers the per-type
    accuracy bars in tuning. Returns the new month, or None if unchanged.
    """
    cfg = get_tuning().month_advancement(group)
    if not cfg.get("auto_advance_enabled", False):
        return None
    if child.current_month >= 12:
        return None

    lessons_result = await db.execute(
        select(Lesson.id).where(
            Lesson.month == child.current_month,
            Lesson.is_active.is_(True),
        )
    )
    month_lesson_ids = {row[0] for row in lessons_result}
    if not month_lesson_ids:
        return None

    completed = await get_completed_lesson_ids(db, child.id)
    ratio = len(month_lesson_ids & completed) / len(month_lesson_ids)
    if ratio < cfg.get("required_lessons_complete_ratio", 1.0):
        return None

    child.current_month = min(12, child.current_month + 1)
    if child.current_month > child.current_phase * 3:
        child.current_phase = min(4, child.current_phase + 1)
    return child.current_month
