from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.redis import get_redis
from app.models.models import TTSAudioCache

try:
    import boto3
    from botocore.exceptions import ClientError
except Exception:  # pragma: no cover - optional runtime dependency fallback
    boto3 = None
    ClientError = Exception


settings = get_settings()
REDIS_TTL_SECONDS = 60 * 60 * 24 * 30


@dataclass(frozen=True)
class TTSCacheRequest:
    text: str
    voice: str
    speed: float
    provider: str
    model_name: str
    response_format: str = "mp3"

    @property
    def normalized_text(self) -> str:
        return re.sub(r"\s+", " ", self.text.strip().lower())

    @property
    def normalized_speed(self) -> str:
        return f"{self.speed:.2f}".rstrip("0").rstrip(".")

    @property
    def text_hash(self) -> str:
        payload = ":".join(
            [
                self.provider,
                self.model_name,
                self.voice,
                self.normalized_speed,
                self.response_format,
                self.normalized_text,
            ]
        )
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    @property
    def legacy_text_hash(self) -> str:
        payload = f"{self.normalized_text}:{self.voice}:{self.speed}"
        return hashlib.md5(payload.encode("utf-8")).hexdigest()

    @property
    def object_key(self) -> str:
        return (
            f"tts/{self.provider}/{self.model_name}/"
            f"{self.voice}-{self.normalized_speed}/{self.text_hash}.{self.response_format}"
        )


@dataclass
class CachedAudio:
    audio_bytes: bytes
    text_hash: str
    usage_count: int
    storage: str
    content_type: str = "audio/mpeg"


class TTSAudioCacheService:
    def __init__(self) -> None:
        self._s3_client: Any | None = None
        self._bucket_checked = False

    async def get_cached_audio(
        self,
        db: AsyncSession,
        request: TTSCacheRequest,
    ) -> CachedAudio | None:
        redis_meta = await self._get_redis_metadata(request.text_hash)
        if redis_meta and redis_meta.get("object_key"):
            audio = await self._read_object(str(redis_meta["object_key"]))
            if audio is not None:
                usage_count = await self._touch_cache_entry(db, request.text_hash)
                return CachedAudio(
                    audio_bytes=audio,
                    text_hash=request.text_hash,
                    usage_count=usage_count,
                    storage="redis+s3",
                    content_type=str(redis_meta.get("content_type") or "audio/mpeg"),
                )

        result = await db.execute(
            select(TTSAudioCache)
            .where(TTSAudioCache.text_hash.in_([request.text_hash, request.legacy_text_hash]))
            .order_by(TTSAudioCache.created_at.desc())
            .limit(1)
        )
        cached = result.scalar_one_or_none()
        if cached is None:
            return None

        audio: bytes | None = None
        storage = "db"
        if cached.object_key:
            audio = await self._read_object(cached.object_key)
            storage = "s3"
        if audio is None and cached.audio_data:
            audio = base64.b64decode(cached.audio_data)
            storage = "db"
        if audio is None:
            return None

        cached.usage_count += 1
        cached.last_used_at = datetime.now(timezone.utc)
        await db.flush()

        if cached.object_key:
            await self._set_redis_metadata(
                request.text_hash,
                {
                    "object_key": cached.object_key,
                    "content_type": cached.content_type,
                    "audio_size_bytes": cached.audio_size_bytes,
                },
            )

        return CachedAudio(
            audio_bytes=audio,
            text_hash=cached.text_hash,
            usage_count=cached.usage_count,
            storage=storage,
            content_type=cached.content_type,
        )

    async def store_audio(
        self,
        db: AsyncSession,
        request: TTSCacheRequest,
        audio_bytes: bytes,
        content_type: str = "audio/mpeg",
    ) -> TTSAudioCache:
        checksum = hashlib.sha256(audio_bytes).hexdigest()
        object_key: str | None = None
        audio_data: str | None = None

        if await self._write_object(request.object_key, audio_bytes, content_type):
            object_key = request.object_key
            await self._set_redis_metadata(
                request.text_hash,
                {
                    "object_key": object_key,
                    "content_type": content_type,
                    "audio_size_bytes": len(audio_bytes),
                },
            )
        else:
            audio_data = base64.b64encode(audio_bytes).decode("utf-8")

        result = await db.execute(
            select(TTSAudioCache).where(TTSAudioCache.text_hash == request.text_hash)
        )
        cache_entry = result.scalar_one_or_none()
        if cache_entry is None:
            cache_entry = TTSAudioCache(
                text_content=request.text[:500],
                text_hash=request.text_hash,
                provider=request.provider,
                model_name=request.model_name,
                voice=request.voice,
                speed=request.speed,
                content_type=content_type,
                object_key=object_key,
                checksum=checksum,
                audio_data=audio_data,
                audio_size_bytes=len(audio_bytes),
                usage_count=1,
            )
            db.add(cache_entry)
        else:
            cache_entry.text_content = request.text[:500]
            cache_entry.provider = request.provider
            cache_entry.model_name = request.model_name
            cache_entry.voice = request.voice
            cache_entry.speed = request.speed
            cache_entry.content_type = content_type
            cache_entry.object_key = object_key or cache_entry.object_key
            cache_entry.checksum = checksum
            cache_entry.audio_data = audio_data
            cache_entry.audio_size_bytes = len(audio_bytes)
            cache_entry.usage_count += 1
            cache_entry.last_used_at = datetime.now(timezone.utc)

        await db.flush()
        return cache_entry

    async def migrate_legacy_entry(self, cache_entry: TTSAudioCache) -> bool:
        if cache_entry.object_key or not cache_entry.audio_data:
            return False

        audio_bytes = base64.b64decode(cache_entry.audio_data)
        object_key = f"tts/legacy/{cache_entry.text_hash}.mp3"
        content_type = cache_entry.content_type or "audio/mpeg"
        if not await self._write_object(object_key, audio_bytes, content_type):
            return False

        cache_entry.object_key = object_key
        cache_entry.checksum = hashlib.sha256(audio_bytes).hexdigest()
        cache_entry.audio_data = None
        cache_entry.audio_size_bytes = len(audio_bytes)
        await self._set_redis_metadata(
            cache_entry.text_hash,
            {
                "object_key": object_key,
                "content_type": content_type,
                "audio_size_bytes": len(audio_bytes),
            },
        )
        return True

    async def _get_redis_metadata(self, text_hash: str) -> dict[str, Any] | None:
        try:
            redis = await get_redis()
            raw = await redis.get(self._redis_key(text_hash))
        except Exception:
            return None
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return None

    async def _set_redis_metadata(self, text_hash: str, metadata: dict[str, Any]) -> None:
        try:
            redis = await get_redis()
            await redis.set(self._redis_key(text_hash), json.dumps(metadata), ex=REDIS_TTL_SECONDS)
        except Exception:
            return

    async def _touch_cache_entry(self, db: AsyncSession, text_hash: str) -> int:
        result = await db.execute(
            select(TTSAudioCache).where(TTSAudioCache.text_hash == text_hash)
        )
        cache_entry = result.scalar_one_or_none()
        if cache_entry is None:
            return 0
        cache_entry.usage_count += 1
        cache_entry.last_used_at = datetime.now(timezone.utc)
        await db.flush()
        return cache_entry.usage_count

    def _redis_key(self, text_hash: str) -> str:
        return f"tts:audio:{text_hash}"

    def _get_s3_client(self):
        if boto3 is None:
            return None
        if self._s3_client is None:
            self._s3_client = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name=settings.s3_region,
            )
        return self._s3_client

    async def _ensure_bucket(self) -> bool:
        if self._bucket_checked:
            return True

        client = self._get_s3_client()
        if client is None:
            return False

        def ensure() -> bool:
            try:
                client.head_bucket(Bucket=settings.s3_bucket_audio)
            except ClientError:
                params: dict[str, Any] = {"Bucket": settings.s3_bucket_audio}
                if settings.s3_region != "us-east-1":
                    params["CreateBucketConfiguration"] = {
                        "LocationConstraint": settings.s3_region,
                    }
                client.create_bucket(**params)
            return True

        try:
            self._bucket_checked = await asyncio.to_thread(ensure)
        except Exception:
            self._bucket_checked = False
        return self._bucket_checked

    async def _read_object(self, object_key: str) -> bytes | None:
        if not await self._ensure_bucket():
            return None
        client = self._get_s3_client()
        if client is None:
            return None

        def read() -> bytes:
            response = client.get_object(Bucket=settings.s3_bucket_audio, Key=object_key)
            return response["Body"].read()

        try:
            return await asyncio.to_thread(read)
        except Exception:
            return None

    async def _write_object(
        self,
        object_key: str,
        audio_bytes: bytes,
        content_type: str,
    ) -> bool:
        if not await self._ensure_bucket():
            return False
        client = self._get_s3_client()
        if client is None:
            return False

        def write() -> None:
            client.put_object(
                Bucket=settings.s3_bucket_audio,
                Key=object_key,
                Body=audio_bytes,
                ContentType=content_type,
                CacheControl="public, max-age=31536000",
            )

        try:
            await asyncio.to_thread(write)
            return True
        except Exception:
            return False


_tts_cache_service: TTSAudioCacheService | None = None


def get_tts_cache_service() -> TTSAudioCacheService:
    global _tts_cache_service
    if _tts_cache_service is None:
        _tts_cache_service = TTSAudioCacheService()
    return _tts_cache_service
