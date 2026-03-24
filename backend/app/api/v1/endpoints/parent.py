from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    ChildProfile,
    CollectedCharacter,
    LearningRecord,
    LessonType,
    PronunciationRecord,
)
from app.schemas.schemas import (
    ChildProfileResponse,
    DailyStatResponse,
    DashboardResponse,
    LearningRecordResponse,
    WeeklyReportResponse,
)
from app.services.llm_router import RequestType, get_llm_router

router = APIRouter(prefix="/parent", tags=["parent"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    children_result = await db.execute(
        select(ChildProfile)
        .where(ChildProfile.parent_id == uuid.UUID(user_id))
        .order_by(ChildProfile.created_at)
    )
    children = list(children_result.scalars().all())

    if not children:
        return DashboardResponse(children=[], recent_activity=[], weekly_summary=None)

    first_child = children[0]

    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    records_result = await db.execute(
        select(LearningRecord)
        .where(
            LearningRecord.child_id == first_child.id,
            LearningRecord.completed_at >= week_ago,
        )
        .order_by(LearningRecord.completed_at.desc())
        .limit(20)
    )
    recent = list(records_result.scalars().all())

    weekly = await _build_weekly_report(db, first_child)

    return DashboardResponse(
        children=[ChildProfileResponse.model_validate(c) for c in children],
        recent_activity=[LearningRecordResponse.model_validate(r) for r in recent],
        weekly_summary=weekly,
    )


@router.get("/report/weekly/{child_id}", response_model=WeeklyReportResponse)
async def get_weekly_report(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child_result = await db.execute(
        select(ChildProfile).where(
            ChildProfile.id == child_id,
            ChildProfile.parent_id == uuid.UUID(user_id),
        )
    )
    child = child_result.scalar_one_or_none()
    if child is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Child not found")

    report = await _build_weekly_report(db, child)
    return report


async def _build_weekly_report(
    db: AsyncSession, child: ChildProfile
) -> WeeklyReportResponse:
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    records_result = await db.execute(
        select(LearningRecord)
        .where(
            LearningRecord.child_id == child.id,
            LearningRecord.completed_at >= week_ago,
        )
        .order_by(LearningRecord.completed_at)
    )
    records = list(records_result.scalars().all())

    daily_map: dict[str, list[LearningRecord]] = {}
    for r in records:
        day_key = r.completed_at.strftime("%Y-%m-%d")
        daily_map.setdefault(day_key, []).append(r)

    daily_stats = []
    for day in range(7):
        date = (week_ago + timedelta(days=day + 1)).strftime("%Y-%m-%d")
        day_records = daily_map.get(date, [])
        total_time = sum(r.time_spent_seconds for r in day_records)
        total_xp = sum(r.xp_earned for r in day_records)
        total_correct = sum(r.correct_items for r in day_records)
        total_items = sum(r.total_items for r in day_records)
        accuracy = (total_correct / total_items) if total_items > 0 else 0.0

        daily_stats.append(DailyStatResponse(
            date=date,
            total_time_seconds=total_time,
            lessons_completed=len(day_records),
            xp_earned=total_xp,
            accuracy=round(accuracy, 2),
        ))

    def _accuracy_by_type(lesson_type: LessonType) -> float:
        typed = [r for r in records if r.lesson_type == lesson_type]
        total = sum(r.total_items for r in typed)
        correct = sum(r.correct_items for r in typed)
        return round((correct / total), 2) if total > 0 else 0.0

    pron_result = await db.execute(
        select(func.avg(PronunciationRecord.overall_score))
        .where(
            PronunciationRecord.child_id == child.id,
            PronunciationRecord.recorded_at >= week_ago,
        )
    )
    pron_avg = pron_result.scalar() or 0.0

    collected_result = await db.execute(
        select(func.count(CollectedCharacter.id))
        .where(CollectedCharacter.child_id == child.id)
    )
    total_collected = collected_result.scalar() or 0

    new_words = sum(r.correct_items for r in records if r.lesson_type == LessonType.SIGHT_WORDS)

    # LLM analysis (optional, Tier 2)
    llm_analysis: Optional[str] = None
    try:
        llm = get_llm_router()
        summary_data = {
            "phonics_accuracy": _accuracy_by_type(LessonType.PHONICS),
            "sight_word_accuracy": _accuracy_by_type(LessonType.SIGHT_WORDS),
            "sentence_accuracy": _accuracy_by_type(LessonType.SENTENCES),
            "pronunciation_avg": round(pron_avg, 1),
            "total_lessons": len(records),
            "streak": child.streak_days,
        }
        result = await llm.generate(
            request_type=RequestType.PARENT_REPORT,
            messages=[{
                "role": "user",
                "content": f"Analyze this child's weekly learning data and provide 2-3 sentences of insight in Korean: {summary_data}",
            }],
            system_prompt=(
                "You are a children's English education specialist. "
                "Analyze the data and give brief, encouraging feedback to the parent in Korean. "
                "Mention specific strengths and one area for improvement."
            ),
        )
        llm_analysis = result.text
    except Exception:
        pass

    return WeeklyReportResponse(
        child=ChildProfileResponse.model_validate(child),
        period_start=week_ago.strftime("%Y-%m-%d"),
        period_end=now.strftime("%Y-%m-%d"),
        daily_stats=daily_stats,
        phonics_accuracy=_accuracy_by_type(LessonType.PHONICS),
        sight_word_accuracy=_accuracy_by_type(LessonType.SIGHT_WORDS),
        sentence_accuracy=_accuracy_by_type(LessonType.SENTENCES),
        pronunciation_avg_score=round(pron_avg, 1),
        new_words_learned=new_words,
        characters_collected=total_collected,
        streak_days=child.streak_days,
        llm_analysis=llm_analysis,
    )
