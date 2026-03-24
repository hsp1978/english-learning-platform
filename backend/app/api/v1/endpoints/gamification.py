from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.models import (
    Character,
    ChildProfile,
    CollectedCharacter,
    PurchasedItem,
    ShopItem,
)
from app.schemas.schemas import (
    CharacterResponse,
    CharacterUnlockRequest,
    CharacterUnlockResponse,
    PurchaseRequest,
    PurchaseResponse,
    ShopItemResponse,
)

router = APIRouter(prefix="/game", tags=["gamification"])


@router.get("/characters", response_model=list[CharacterResponse])
async def list_characters(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _verify_child(db, child_id, user_id)

    chars_result = await db.execute(
        select(Character).order_by(Character.phase_number, Character.name)
    )
    characters = list(chars_result.scalars().all())

    collected_result = await db.execute(
        select(CollectedCharacter).where(CollectedCharacter.child_id == child_id)
    )
    collected = {cc.character_id: cc for cc in collected_result.scalars().all()}

    response = []
    for char in characters:
        cc = collected.get(char.id)
        response.append(
            CharacterResponse(
                id=char.id,
                name=char.name,
                name_ko=char.name_ko,
                description=char.description,
                rarity=char.rarity,
                image_url_locked=char.image_url_locked,
                image_url_unlocked=char.image_url_unlocked,
                phase_number=char.phase_number,
                is_collected=cc is not None,
                unlocked_at=cc.unlocked_at if cc else None,
            )
        )
    return response


@router.post("/characters/unlock", response_model=CharacterUnlockResponse)
async def unlock_character(
    child_id: uuid.UUID,
    body: CharacterUnlockRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _verify_child(db, child_id, user_id)

    char_result = await db.execute(
        select(Character).where(Character.id == body.character_id)
    )
    character = char_result.scalar_one_or_none()
    if character is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Character not found")

    existing = await db.execute(
        select(CollectedCharacter).where(
            CollectedCharacter.child_id == child_id,
            CollectedCharacter.character_id == body.character_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Character already collected",
        )

    cc = CollectedCharacter(child_id=child_id, character_id=body.character_id)
    db.add(cc)

    rarity_xp = {"common": 10, "rare": 25, "epic": 50, "legendary": 100}
    rarity_coins = {"common": 5, "rare": 15, "epic": 30, "legendary": 75}

    xp_earned = rarity_xp.get(character.rarity.value, 10)
    coins_earned = rarity_coins.get(character.rarity.value, 5)
    child.total_xp += xp_earned
    child.coins += coins_earned

    return CharacterUnlockResponse(
        success=True,
        character=CharacterResponse(
            id=character.id,
            name=character.name,
            name_ko=character.name_ko,
            description=character.description,
            rarity=character.rarity,
            image_url_locked=character.image_url_locked,
            image_url_unlocked=character.image_url_unlocked,
            phase_number=character.phase_number,
            is_collected=True,
            unlocked_at=datetime.now(timezone.utc),
        ),
        xp_earned=xp_earned,
        coins_earned=coins_earned,
    )


@router.get("/shop", response_model=list[ShopItemResponse])
async def list_shop_items(
    child_id: uuid.UUID,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    await _verify_child(db, child_id, user_id)

    items_result = await db.execute(
        select(ShopItem).where(ShopItem.is_active.is_(True)).order_by(ShopItem.category)
    )
    items = list(items_result.scalars().all())

    purchased_result = await db.execute(
        select(PurchasedItem.shop_item_id).where(PurchasedItem.child_id == child_id)
    )
    purchased_ids = {row[0] for row in purchased_result}

    return [
        ShopItemResponse(
            id=item.id,
            category=item.category,
            name=item.name,
            name_ko=item.name_ko,
            price_coins=item.price_coins,
            image_url=item.image_url,
            is_purchased=item.id in purchased_ids,
        )
        for item in items
    ]


@router.post("/shop/purchase", response_model=PurchaseResponse)
async def purchase_item(
    child_id: uuid.UUID,
    body: PurchaseRequest,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    child = await _verify_child(db, child_id, user_id)

    item_result = await db.execute(
        select(ShopItem).where(ShopItem.id == body.item_id, ShopItem.is_active.is_(True))
    )
    item = item_result.scalar_one_or_none()
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    existing = await db.execute(
        select(PurchasedItem).where(
            PurchasedItem.child_id == child_id,
            PurchasedItem.shop_item_id == body.item_id,
        )
    )
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Item already purchased",
        )

    if child.coins < item.price_coins:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient coins",
        )

    child.coins -= item.price_coins
    db.add(PurchasedItem(child_id=child_id, shop_item_id=body.item_id))

    return PurchaseResponse(success=True, remaining_coins=child.coins)


async def _verify_child(
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
