"""
Seed badge data
"""
import asyncio
import uuid

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.models import Badge


async def seed_badges():
    """Seed initial badge data"""
    async with async_session_factory() as db:
        # Check if badges already exist
        result = await db.execute(select(Badge))
        existing = result.scalars().first()
        if existing:
            print("✓ Badges already seeded")
            return

        badges = [
            # XP milestones
            Badge(
                id=uuid.uuid4(),
                code="first_steps",
                name="First Steps",
                name_ko="첫걸음",
                description="Complete your first lesson",
                condition_type="lessons_completed",
                condition_value=1,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="rising_star",
                name="Rising Star",
                name_ko="떠오르는 별",
                description="Earn 100 XP",
                condition_type="xp_milestone",
                condition_value=100,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="super_learner",
                name="Super Learner",
                name_ko="슈퍼 학습자",
                description="Earn 500 XP",
                condition_type="xp_milestone",
                condition_value=500,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="xp_master",
                name="XP Master",
                name_ko="XP 마스터",
                description="Earn 1000 XP",
                condition_type="xp_milestone",
                condition_value=1000,
                image_url=None,
            ),
            # Achievement badges
            Badge(
                id=uuid.uuid4(),
                code="perfect_score",
                name="Perfect Score",
                name_ko="완벽해요",
                description="Get a perfect score on a lesson",
                condition_type="perfect_scores",
                condition_value=1,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="perfectionist",
                name="Perfectionist",
                name_ko="완벽주의자",
                description="Get 10 perfect scores",
                condition_type="perfect_scores",
                condition_value=10,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="lesson_master",
                name="Lesson Master",
                name_ko="레슨 마스터",
                description="Complete 20 lessons",
                condition_type="lessons_completed",
                condition_value=20,
                image_url=None,
            ),
            # Streak badges
            Badge(
                id=uuid.uuid4(),
                code="on_fire",
                name="On Fire",
                name_ko="불타는 열정",
                description="3-day streak",
                condition_type="streak_days",
                condition_value=3,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="unstoppable",
                name="Unstoppable",
                name_ko="멈출 수 없어",
                description="7-day streak",
                condition_type="streak_days",
                condition_value=7,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="legend",
                name="Legend",
                name_ko="전설",
                description="30-day streak",
                condition_type="streak_days",
                condition_value=30,
                image_url=None,
            ),
            # Collection badges
            Badge(
                id=uuid.uuid4(),
                code="collector",
                name="Collector",
                name_ko="수집가",
                description="Collect 5 characters",
                condition_type="characters_collected",
                condition_value=5,
                image_url=None,
            ),
            Badge(
                id=uuid.uuid4(),
                code="master_collector",
                name="Master Collector",
                name_ko="수집 마스터",
                description="Collect 15 characters",
                condition_type="characters_collected",
                condition_value=15,
                image_url=None,
            ),
            # Story badges
            Badge(
                id=uuid.uuid4(),
                code="bookworm",
                name="Bookworm",
                name_ko="책벌레",
                description="Complete 3 stories",
                condition_type="story_completed",
                condition_value=3,
                image_url=None,
            ),
        ]

        for badge in badges:
            db.add(badge)

        await db.commit()
        print(f"✓ Created {len(badges)} badges")


if __name__ == "__main__":
    asyncio.run(seed_badges())
