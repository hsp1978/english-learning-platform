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
    Story,
    StoryQuiz,
)
from app.schemas.schemas import (
    QuizAnswerRequest,
    QuizResultResponse,
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

    # Check which stories have been read
    read_result = await db.execute(
        select(LearningRecord.lesson_id)
        .where(
            LearningRecord.child_id == child_id,
            LearningRecord.lesson_type == "story",
        )
        .distinct()
    )
    read_ids = {row[0] for row in read_result}

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
    await _get_child(db, child_id, user_id)

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
    await _get_child(db, child_id, user_id)

    result = await db.execute(
        select(StoryQuiz).where(StoryQuiz.id == body.question_id)
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
