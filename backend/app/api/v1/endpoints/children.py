from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import ChildProfile
from app.schemas.schemas import (
    ChildProfileCreate,
    ChildProfileResponse,
    ChildProgressUpdate,
)

router = APIRouter(prefix="/children", tags=["children"])


@router.get("", response_model=list[ChildProfileResponse])
async def list_children(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChildProfile)
        .where(ChildProfile.parent_id == uuid.UUID(user_id))
        .order_by(ChildProfile.created_at)
    )
    children = list(result.scalars().all())
    return [ChildProfileResponse.model_validate(c) for c in children]


@router.post("", response_model=ChildProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_child(
    body: ChildProfileCreate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = ChildProfile(
        parent_id=uuid.UUID(user_id),
        nickname=body.nickname,
        birth_year=body.birth_year,
    )
    db.add(child)
    await db.flush()
    return ChildProfileResponse.model_validate(child)


@router.get("/{child_id}", response_model=ChildProfileResponse)
async def get_child(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)
    return ChildProfileResponse.model_validate(child)


@router.patch("/{child_id}", response_model=ChildProfileResponse)
async def update_child_progress(
    child_id: uuid.UUID,
    body: ChildProgressUpdate,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _get_child(db, child_id, user_id)

    if body.xp_delta is not None:
        child.total_xp = max(0, child.total_xp + body.xp_delta)
    if body.coins_delta is not None:
        child.coins = max(0, child.coins + body.coins_delta)
    if body.advance_month:
        child.current_month = min(12, child.current_month + 1)
        if child.current_month > child.current_phase * 3:
            child.current_phase = min(4, child.current_phase + 1)

    return ChildProfileResponse.model_validate(child)


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
