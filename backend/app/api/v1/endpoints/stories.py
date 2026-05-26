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
    LearningRecord,
    Lesson,
    LessonType,
    Story,
    StoryQuiz,
)
from app.schemas.schemas import (
    LearningRecordResponse,
    QuizAnswerRequest,
    QuizResultResponse,
    StoryCompletionRequest,
    StoryDetailResponse,
    StoryListItem,
    StoryPageResponse,
    StoryQuizResponse,
)

router = APIRouter(prefix="/stories", tags=["stories"])


@router.get("", response_model=list[StoryListItem])
async def list_stories(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)

    result = await db.execute(
        select(Story)
        .where(
            Story.is_active.is_(True),
            Story.target_month <= child.current_month,
        )
        .order_by(Story.target_month, Story.title)
    )
    stories = list(result.scalars().all())

    # Check which stories have been read. Story progress is stored against the
    # month-level STORY lesson, while the actual story id lives in detail_data.
    read_result = await db.execute(
        select(LearningRecord)
        .where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_type == LessonType.STORY,
        )
    )
    read_ids: set[uuid.UUID] = set()
    for record in read_result.scalars().all():
        story_id = (record.detail_data or {}).get("story_id")
        if story_id is None:
            continue
        try:
            read_ids.add(uuid.UUID(str(story_id)))
        except ValueError:
            continue

    return [
        StoryListItem(
            id=s.id,
            title=s.title,
            genre=s.genre,
            lexile_min=s.lexile_min,
            lexile_max=s.lexile_max,
            page_count=s.page_count,
            cover_image_url=s.cover_image_url,
            is_fiction=s.is_fiction,
            is_read=s.id in read_ids,
        )
        for s in stories
    ]


@router.get("/{story_id}", response_model=StoryDetailResponse)
async def get_story_detail(
    story_id: uuid.UUID,
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)

    result = await db.execute(
        select(Story)
        .options(
            selectinload(Story.pages),
            selectinload(Story.quiz_questions),
        )
        .where(Story.id == story_id)
    )
    story = result.scalar_one_or_none()
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    _ensure_story_accessible(story, child)

    return StoryDetailResponse(
        id=story.id,
        title=story.title,
        author=story.author,
        genre=story.genre,
        page_count=story.page_count,
        pages=[
            StoryPageResponse(
                page_number=p.page_number,
                text_content=p.text_content,
                words_data=p.words_data,
                illustration_url=p.illustration_url,
                audio_url=p.audio_url,
            )
            for p in sorted(story.pages, key=lambda p: p.page_number)
        ],
        quizzes=[
            StoryQuizResponse(
                id=q.id,
                question_type=q.question_type,
                question_text=q.question_text,
                choices=q.choices,
                correct_index=q.correct_index,
            )
            for q in story.quiz_questions
        ],
    )


@router.post("/{story_id}/quiz", response_model=QuizResultResponse)
async def answer_quiz(
    story_id: uuid.UUID,
    body: QuizAnswerRequest,
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)
    story = await _get_story(db, story_id)
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    _ensure_story_accessible(story, child)

    result = await db.execute(
        select(StoryQuiz).where(
            StoryQuiz.id == body.question_id,
            StoryQuiz.story_id == story_id,
        )
    )
    quiz = result.scalar_one_or_none()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")

    correct = body.selected_index == quiz.correct_index
    xp = 7 if correct else 0

    return QuizResultResponse(
        correct=correct,
        correct_index=quiz.correct_index,
        xp_earned=xp,
    )


@router.post("/{story_id}/complete", response_model=LearningRecordResponse)
async def complete_story(
    story_id: uuid.UUID,
    body: StoryCompletionRequest,
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)
    story = await _get_story(db, story_id)
    if story is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    _ensure_story_accessible(story, child)

    if body.correct_items > body.total_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="correct_items cannot exceed total_items",
        )

    lesson_result = await db.execute(
        select(Lesson)
        .where(
            Lesson.lesson_type == LessonType.STORY,
            Lesson.month == story.target_month,
            Lesson.is_active.is_(True),
        )
        .order_by(Lesson.order_index)
        .limit(1)
    )
    lesson = lesson_result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Story lesson is not configured for this month",
        )

    xp_earned = lesson.xp_reward if body.score >= 0.6 else round(lesson.xp_reward * body.score)
    record = LearningRecord(
        child_id=child_id,
        lesson_id=lesson.id,
        lesson_type=LessonType.STORY,
        score=body.score,
        total_items=body.total_items,
        correct_items=body.correct_items,
        time_spent_seconds=body.time_spent_seconds,
        xp_earned=xp_earned,
        detail_data={
            "story_id": str(story.id),
            "story_title": story.title,
            "target_month": story.target_month,
        },
    )
    db.add(record)

    child.total_xp += xp_earned
    _update_level(child)
    await db.flush()

    try:
        from app.services.badge_service import get_badge_service

        await get_badge_service().check_and_award_badges(db, child_id)
    except Exception as exc:
        print(f"Badge check failed: {exc}")

    return LearningRecordResponse.model_validate(record)


async def _get_child(
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


async def _get_story(db: AsyncSession, story_id: uuid.UUID) -> Story | None:
    result = await db.execute(select(Story).where(Story.id == story_id))
    return result.scalar_one_or_none()


def _ensure_story_accessible(story: Story, child: ChildProfile) -> None:
    if not story.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    if story.target_month > child.current_month:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Story is locked",
        )


def _update_level(child: ChildProfile) -> None:
    level_thresholds = [0, 100, 300, 500, 800, 1200, 1700, 2300, 3000, 4000, 5200, 6500, 8000]
    new_level = 1
    for i, threshold in enumerate(level_thresholds):
        if child.total_xp >= threshold:
            new_level = i + 1
    child.level = new_level
