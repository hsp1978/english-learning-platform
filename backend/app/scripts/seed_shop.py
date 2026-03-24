"""
Seed shop items
"""
import asyncio
import uuid

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.models import ShopItem


async def seed_shop_items():
    """Seed shop item data"""
    async with async_session_factory() as db:
        # Check if shop items already exist
        result = await db.execute(select(ShopItem))
        existing = result.scalars().first()
        if existing:
            print("✓ Shop items already seeded")
            return

        items = [
            # Backgrounds
            ShopItem(
                id=uuid.uuid4(),
                category="background",
                name="Forest Theme",
                name_ko="숲 테마",
                price_coins=50,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="background",
                name="Ocean Theme",
                name_ko="바다 테마",
                price_coins=50,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="background",
                name="Space Theme",
                name_ko="우주 테마",
                price_coins=75,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="background",
                name="Castle Theme",
                name_ko="성 테마",
                price_coins=100,
                image_url=None,
                is_active=True,
            ),
            # Avatars
            ShopItem(
                id=uuid.uuid4(),
                category="avatar",
                name="Cool Sunglasses",
                name_ko="멋진 선글라스",
                price_coins=30,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="avatar",
                name="Wizard Hat",
                name_ko="마법사 모자",
                price_coins=40,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="avatar",
                name="Crown",
                name_ko="왕관",
                price_coins=80,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="avatar",
                name="Rainbow Wings",
                name_ko="무지개 날개",
                price_coins=120,
                image_url=None,
                is_active=True,
            ),
            # Stickers
            ShopItem(
                id=uuid.uuid4(),
                category="sticker",
                name="Star Pack",
                name_ko="별 스티커팩",
                price_coins=20,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="sticker",
                name="Animal Pack",
                name_ko="동물 스티커팩",
                price_coins=25,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="sticker",
                name="Emoji Pack",
                name_ko="이모지 스티커팩",
                price_coins=25,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="sticker",
                name="Fantasy Pack",
                name_ko="판타지 스티커팩",
                price_coins=35,
                image_url=None,
                is_active=True,
            ),
            # Themes
            ShopItem(
                id=uuid.uuid4(),
                category="theme",
                name="Dark Mode",
                name_ko="다크 모드",
                price_coins=60,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="theme",
                name="Pastel Theme",
                name_ko="파스텔 테마",
                price_coins=50,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="theme",
                name="Neon Theme",
                name_ko="네온 테마",
                price_coins=80,
                image_url=None,
                is_active=True,
            ),
            # Items (Power-ups)
            ShopItem(
                id=uuid.uuid4(),
                category="item",
                name="XP Booster",
                name_ko="경험치 부스터",
                price_coins=100,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="item",
                name="Streak Freeze",
                name_ko="연속기록 보호",
                price_coins=150,
                image_url=None,
                is_active=True,
            ),
            ShopItem(
                id=uuid.uuid4(),
                category="item",
                name="Hint Pack",
                name_ko="힌트 팩",
                price_coins=40,
                image_url=None,
                is_active=True,
            ),
        ]

        for item in items:
            db.add(item)

        await db.commit()
        print(f"✓ Created {len(items)} shop items")


if __name__ == "__main__":
    asyncio.run(seed_shop_items())
