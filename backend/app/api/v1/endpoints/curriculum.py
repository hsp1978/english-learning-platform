from __future__ import annotations

import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
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
    LessonType,
)
from app.schemas.schemas import (
    AdaptiveRecommendation,
    CurriculumMapResponse,
    CurriculumPhaseResponse,
    LearningRecordCreate,
    LearningRecordResponse,
    LessonDetailResponse,
    LessonItemResponse,
    LessonResponse,
    PublicCurriculumMapResponse,
)
from app.services.progress_service import (
    COMPLETION_SCORE_THRESHOLD,
    calculate_xp_delta,
    completion_attempt_filter,
    get_best_lesson_score,
    get_completed_lesson_ids,
    maybe_advance_month,
)
from app.services.badge_tasks import check_and_award_badges_background
from app.services.spaced_repetition import seed_review_items_from_lesson

router = APIRouter(tags=["curriculum"])


@router.get("/public/curriculum/map", response_model=PublicCurriculumMapResponse)
async def get_public_curriculum_map(
    db: AsyncSession = Depends(get_db),
):
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

    return PublicCurriculumMapResponse(
        phases=[CurriculumPhaseResponse.model_validate(p) for p in phases],
        lessons=[
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
                is_completed=False,
                is_locked=False,
            )
            for lesson in lessons
        ],
    )


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

    completed_ids = await get_completed_lesson_ids(db, child_id)

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
        select(LearningRecord.score)
        .where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_id == lesson_id,
            completion_attempt_filter(),
        )
        .order_by(LearningRecord.score.desc())
        .limit(1)
    )
    best_score = records_result.scalar_one_or_none() or 0.0
    is_completed = best_score >= COMPLETION_SCORE_THRESHOLD

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
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child_or_404(db, child_id, user_id)

    lesson_result = await db.execute(select(Lesson).where(Lesson.id == body.lesson_id))
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    previous_best_score = await get_best_lesson_score(db, child_id, body.lesson_id)
    xp_earned = calculate_xp_delta(lesson, previous_best_score, body.score)

    prev_result = await db.execute(
        select(LearningRecord)
        .where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_type == body.lesson_type,
        )
        .order_by(LearningRecord.completed_at.desc())
        .limit(2)
    )
    prev_records = list(prev_result.scalars().all())

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
    await db.flush()

    # Feed missed/known items into the spaced-repetition review queue
    await seed_review_items_from_lesson(db, child_id, body.lesson_type, body.detail_data)

    # Auto-advance to the next month when this month's lessons are done
    new_month = await maybe_advance_month(db, child)

    # Evaluate adaptive-difficulty recommendation based on last 2 records + current
    recommendation = _evaluate_adaptive_rules(prev_records, record)

    response = LearningRecordResponse.model_validate(record)
    response.adaptive_recommendation = recommendation
    response.month_advanced = new_month is not None
    response.new_month = new_month
    await db.commit()
    background_tasks.add_task(check_and_award_badges_background, child_id)
    return response


_LESSON_TYPE_KO = {
    LessonType.PHONICS: "파닉스",
    LessonType.SIGHT_WORDS: "사이트워드",
    LessonType.SENTENCES: "문장",
    LessonType.STORY: "이야기",
    LessonType.CONVERSATION: "대화",
}


def _evaluate_adaptive_rules(
    previous: list[LearningRecord], current: LearningRecord
) -> AdaptiveRecommendation | None:
    relevant = [r for r in previous if r.lesson_type == current.lesson_type]
    window = relevant[:2] + [current]
    if len(window) < 3:
        return None

    if all(r.score >= 0.95 for r in window):
        label = _LESSON_TYPE_KO.get(current.lesson_type, "레슨")
        return AdaptiveRecommendation(
            action="advance",
            lesson_type=current.lesson_type,
            message_ko=f"와, {label} 3번 연속 완벽! 다음 단계로 넘어가볼까? 🚀",
        )

    if all(r.score < 0.5 for r in window):
        label = _LESSON_TYPE_KO.get(current.lesson_type, "레슨")
        return AdaptiveRecommendation(
            action="review",
            lesson_type=current.lesson_type,
            message_ko=f"{label}을(를) 조금 더 연습하면 좋을 것 같아. 복습해볼까? 📚",
        )

    return None


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
