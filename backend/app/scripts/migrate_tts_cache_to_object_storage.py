from __future__ import annotations

import asyncio

from sqlalchemy import select

from app.core.database import async_session_factory
from app.models.models import TTSAudioCache
from app.services.tts_cache_service import get_tts_cache_service


async def main() -> None:
    migrated = 0
    skipped = 0
    failed = 0
    service = get_tts_cache_service()

    async with async_session_factory() as db:
        result = await db.execute(
            select(TTSAudioCache).where(
                TTSAudioCache.object_key.is_(None),
                TTSAudioCache.audio_data.is_not(None),
            )
        )
        entries = list(result.scalars().all())

        for entry in entries:
            try:
                if await service.migrate_legacy_entry(entry):
                    migrated += 1
                else:
                    skipped += 1
            except Exception as exc:
                failed += 1
                print(f"Failed to migrate {entry.text_hash}: {exc}")

        await db.commit()

    print(f"TTS cache migration complete: migrated={migrated}, skipped={skipped}, failed={failed}")


if __name__ == "__main__":
    asyncio.run(main())
