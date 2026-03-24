from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.schemas.schemas import ReviewItemResponse, ReviewResultRequest
from app.services.spaced_repetition import get_items_due_for_review, record_review

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/due", response_model=list[ReviewItemResponse])
async def get_due_items(
    child_id: uuid.UUID,
    limit: int = 20,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    items = await get_items_due_for_review(db, child_id, limit=limit)
    return [ReviewItemResponse.model_validate(item) for item in items]


@router.post("/record", response_model=ReviewItemResponse)
async def submit_review_result(
    child_id: uuid.UUID,
    body: ReviewResultRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    item = await record_review(
        db=db,
        child_id=child_id,
        item_type=body.item_type,
        item_key=body.item_key,
        score=body.score,
    )
    return ReviewItemResponse.model_validate(item)
