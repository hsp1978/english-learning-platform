"""
Badge service for automatic badge awarding
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Badge,
    EarnedBadge,
    ChildProfile,
    LearningRecord,
)


class BadgeService:
    """Service for checking and awarding badges"""

    async def check_and_award_badges(
        self,
        db: AsyncSession,
        child_id: uuid.UUID,
    ) -> list[Badge]:
        """
        Check all badge conditions and award new badges
        Returns list of newly awarded badges
        """
        newly_awarded = []

        # Get child profile
        child_result = await db.execute(
            select(ChildProfile).where(ChildProfile.id == child_id)
        )
        child = child_result.scalar_one_or_none()
        if not child:
            return newly_awarded

        # Get already earned badges
        earned_result = await db.execute(
            select(EarnedBadge.badge_id).where(EarnedBadge.child_id == child_id)
        )
        earned_badge_ids = {row[0] for row in earned_result}

        # Get all badges
        badges_result = await db.execute(select(Badge).where(Badge.is_active.is_(True)))
        all_badges = list(badges_result.scalars().all())

        # Check each badge
        for badge in all_badges:
            if badge.id in earned_badge_ids:
                continue  # Already earned

            if await self._check_badge_condition(db, child, badge):
                # Award badge
                earned = EarnedBadge(
                    child_id=child_id,
                    badge_id=badge.id,
                    earned_at=datetime.now(timezone.utc),
                )
                db.add(earned)
                newly_awarded.append(badge)

                child.coins += badge.reward_coins

        if newly_awarded:
            await db.commit()

        return newly_awarded

    async def _check_badge_condition(
        self,
        db: AsyncSession,
        child: ChildProfile,
        badge: Badge,
    ) -> bool:
        """Check if a specific badge condition is met"""
        condition_type = badge.condition_type
        threshold = badge.condition_value

        if condition_type == "xp_milestone":
            return child.total_xp >= threshold

        elif condition_type == "lessons_completed":
            # Count completed lessons
            result = await db.execute(
                select(func.count(LearningRecord.id))
                .where(
                    LearningRecord.child_id == child.id,
                    LearningRecord.score >= 0.7,  # 70% or higher
                )
                .distinct()
            )
            count = result.scalar() or 0
            return count >= threshold

        elif condition_type == "streak_days":
            return child.streak_days >= threshold

        elif condition_type == "perfect_scores":
            # Count perfect scores (100%)
            result = await db.execute(
                select(func.count(LearningRecord.id)).where(
                    LearningRecord.child_id == child.id,
                    LearningRecord.score >= 0.99,
                )
            )
            count = result.scalar() or 0
            return count >= threshold

        elif condition_type == "month_completed":
            # Check if specific month is completed
            # threshold represents the month number
            return child.current_month > threshold

        elif condition_type == "phase_completed":
            # Check if specific phase is completed
            return child.current_phase > threshold

        elif condition_type == "characters_collected":
            # Count collected characters
            from app.models.models import CollectedCharacter

            result = await db.execute(
                select(func.count(CollectedCharacter.id)).where(
                    CollectedCharacter.child_id == child.id
                )
            )
            count = result.scalar() or 0
            return count >= threshold

        elif condition_type == "story_completed":
            # Count completed stories
            result = await db.execute(
                select(func.count(LearningRecord.id))
                .where(
                    LearningRecord.child_id == child.id,
                    LearningRecord.lesson_type == "story",
                )
                .distinct()
            )
            count = result.scalar() or 0
            return count >= threshold

        return False


_badge_service: BadgeService | None = None


def get_badge_service() -> BadgeService:
    global _badge_service
    if _badge_service is None:
        _badge_service = BadgeService()
    return _badge_service
