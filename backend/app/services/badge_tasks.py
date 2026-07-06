from __future__ import annotations

import uuid

from app.core.database import async_session_factory
from app.services.badge_service import get_badge_service


async def check_and_award_badges_background(child_id: uuid.UUID) -> None:
    async with async_session_factory() as db:
        try:
            await get_badge_service().check_and_award_badges(db, child_id)
            await db.commit()
        except Exception as exc:
            await db.rollback()
            print(f"Badge background task failed: {exc}")
