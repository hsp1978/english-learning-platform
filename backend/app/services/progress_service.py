from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import LearningRecord, Lesson, LessonType

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
