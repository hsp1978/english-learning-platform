from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    ChildProfile,
    CurriculumPhase,
    LearningRecord,
    Lesson,
)
from app.schemas.schemas import (
    CurriculumMapResponse,
    CurriculumPhaseResponse,
    LearningRecordCreate,
    LearningRecordResponse,
    LessonDetailResponse,
    LessonItemResponse,
    LessonResponse,
)

router = APIRouter(tags=["curriculum"])


@router.get("/curriculum/map", response_model=CurriculumMapResponse)
async def get_curriculum_map(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child_or_404(db, child_id, user_id)

    phases_result = await db.execute(
        select(CurriculumPhase).order_by(CurriculumPhase.phase_number)
    )
    phases = list(phases_result.scalars().all())

    lessons_result = await db.execute(
        select(Lesson)
        .where(Lesson.is_active.is_(True))
        .order_by(Lesson.month, Lesson.order_index)
    )
    lessons = list(lessons_result.scalars().all())

    completed_ids = set()
    records_result = await db.execute(
        select(LearningRecord.lesson_id)
        .where(LearningRecord.child_id == child_id)
        .distinct()
    )
    for row in records_result:
        completed_ids.add(row[0])

    lesson_responses = []
    for lesson in lessons:
        is_completed = lesson.id in completed_ids
        is_locked = lesson.month > child.current_month
        lesson_responses.append(
            LessonResponse(
                id=lesson.id,
                lesson_type=lesson.lesson_type,
                month=lesson.month,
                order_index=lesson.order_index,
                title=lesson.title,
                title_ko=lesson.title_ko,
                description=lesson.description,
                phonics_level=lesson.phonics_level,
                sight_word_phase=lesson.sight_word_phase,
                xp_reward=lesson.xp_reward,
                is_completed=is_completed,
                is_locked=is_locked,
            )
        )

    from app.schemas.schemas import ChildProfileResponse

    return CurriculumMapResponse(
        phases=[CurriculumPhaseResponse.model_validate(p) for p in phases],
        lessons=lesson_responses,
        child_progress=ChildProfileResponse.model_validate(child),
    )


@router.get("/curriculum/lesson/{lesson_id}", response_model=LessonDetailResponse)
async def get_lesson_detail(
    lesson_id: uuid.UUID,
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child_or_404(db, child_id, user_id)

    result = await db.execute(
        select(Lesson)
        .options(selectinload(Lesson.items))
        .where(Lesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    if lesson.month > child.current_month:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Lesson is locked")

    records_result = await db.execute(
        select(LearningRecord.lesson_id)
        .where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_id == lesson_id,
        )
        .limit(1)
    )
    is_completed = records_result.scalar_one_or_none() is not None

    return LessonDetailResponse(
        id=lesson.id,
        lesson_type=lesson.lesson_type,
        month=lesson.month,
        order_index=lesson.order_index,
        title=lesson.title,
        title_ko=lesson.title_ko,
        description=lesson.description,
        phonics_level=lesson.phonics_level,
        sight_word_phase=lesson.sight_word_phase,
        xp_reward=lesson.xp_reward,
        is_completed=is_completed,
        is_locked=False,
        unlock_character_id=lesson.unlock_character_id,
        items=[LessonItemResponse.model_validate(item) for item in lesson.items],
    )


@router.post("/progress/record", response_model=LearningRecordResponse)
async def record_learning(
    child_id: uuid.UUID,
    body: LearningRecordCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child_or_404(db, child_id, user_id)

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == body.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    xp_earned = lesson.xp_reward if body.score >= 0.6 else round(lesson.xp_reward * body.score)

    record = LearningRecord(
        child_id=child_id,
        lesson_id=body.lesson_id,
        lesson_type=body.lesson_type,
        score=body.score,
        total_items=body.total_items,
        correct_items=body.correct_items,
        time_spent_seconds=body.time_spent_seconds,
        xp_earned=xp_earned,
        detail_data=body.detail_data,
    )
    db.add(record)

    child.total_xp += xp_earned
    _update_level(child)

    # Check and award badges
    try:
        from app.services.badge_service import get_badge_service
        badge_service = get_badge_service()
        await badge_service.check_and_award_badges(db, child_id)
    except Exception as e:
        # Log error but don't fail the learning record
        print(f"Badge check failed: {e}")

    return LearningRecordResponse.model_validate(record)


def _update_level(child: ChildProfile) -> None:
    level_thresholds = [0, 100, 300, 500, 800, 1200, 1700, 2300, 3000, 4000, 5200, 6500, 8000]
    new_level = 1
    for i, threshold in enumerate(level_thresholds):
        if child.total_xp >= threshold:
            new_level = i + 1
    child.level = new_level


async def _get_child_or_404(
    db: AsyncSession, child_id: uuid.UUID, user_id: str
) -> ChildProfile:
    result = await db.execute(
        select(ChildProfile).where(
            ChildProfile.id == child_id,
            ChildProfile.parent_id == uuid.UUID(user_id),
        )
    )
    child = result.scalar_one_or_none()
    if child is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Child profile not found",
        )
    return child
