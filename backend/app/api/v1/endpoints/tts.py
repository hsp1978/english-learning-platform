"""
OpenAI TTS (Text-to-Speech) API endpoint
Provides high-quality, natural-sounding speech synthesis for story reading
"""

from __future__ import annotations

import base64
import hashlib
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.models import TTSAudioCache

router = APIRouter(prefix="/tts", tags=["tts"])

# Initialize OpenAI client
settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)

# Voice options for children's content
VOICES = {
    "nova": "nova",      # Bright, friendly female voice (recommended for children)
    "shimmer": "shimmer", # Warm, gentle female voice
    "alloy": "alloy",     # Neutral, clear voice
}


@router.post("/synthesize")
async def synthesize_speech(
    text: str,
    voice: str = "nova",
    speed: float = 1.0,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Synthesize speech from text using OpenAI TTS API with database caching

    Args:
        text: Text to synthesize (max 4096 characters)
        voice: Voice to use (nova, shimmer, alloy)
        speed: Playback speed (0.25 to 4.0)
        db: Database session

    Returns:
        MP3 audio stream (cached or freshly generated)
    """
    if not text or len(text.strip()) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text cannot be empty"
        )

    if len(text) > 4096:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text too long (max 4096 characters)"
        )

    if voice not in VOICES:
        voice = "nova"

    if speed < 0.25 or speed > 4.0:
        speed = 1.0

    # Generate cache key from text+voice+speed
    text_hash = hashlib.md5(
        f"{text.strip().lower()}:{voice}:{speed}".encode()
    ).hexdigest()

    # Check cache first
    try:
        result = await db.execute(
            select(TTSAudioCache).where(TTSAudioCache.text_hash == text_hash)
        )
        cached = result.scalar_one_or_none()

        if cached:
            # Cache hit - update usage stats and return cached audio
            await db.execute(
                update(TTSAudioCache)
                .where(TTSAudioCache.id == cached.id)
                .values(usage_count=TTSAudioCache.usage_count + 1)
            )
            await db.commit()

            # Decode base64 audio data
            audio_bytes = base64.b64decode(cached.audio_data)

            return StreamingResponse(
                BytesIO(audio_bytes),
                media_type="audio/mpeg",
                headers={
                    "Content-Disposition": 'inline; filename="speech.mp3"',
                    "Cache-Control": "public, max-age=31536000",
                    "X-Cache-Hit": "true",
                    "X-Cache-Usage": str(cached.usage_count + 1),
                }
            )

    except Exception as e:
        # Log cache lookup error but continue to generate new audio
        print(f"Cache lookup error: {e}")

    # Cache miss - generate new audio with OpenAI TTS
    try:
        response = await client.audio.speech.create(
            model="tts-1",  # Fast, high-quality model
            voice=voice,
            input=text,
            speed=speed,
            response_format="mp3",
        )

        audio_bytes = response.content

        # Store in cache
        try:
            audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
            cache_entry = TTSAudioCache(
                text_content=text[:500],  # Truncate if needed
                text_hash=text_hash,
                voice=voice,
                speed=speed,
                audio_data=audio_b64,
                audio_size_bytes=len(audio_bytes),
                usage_count=1,
            )
            db.add(cache_entry)
            await db.commit()
        except Exception as e:
            # Log cache storage error but still return the audio
            print(f"Cache storage error: {e}")
            await db.rollback()

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Cache-Control": "public, max-age=31536000",
                "X-Cache-Hit": "false",
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}"
        )


@router.post("/synthesize-cached")
async def synthesize_speech_cached(
    text: str,
    voice: str = "nova",
    speed: float = 1.0,
) -> StreamingResponse:
    """
    Synthesize speech with caching support

    Generates a cache key from text+voice+speed.
    In the future, this can check Minio/S3 for cached audio.

    Args:
        text: Text to synthesize
        voice: Voice to use
        speed: Playback speed

    Returns:
        MP3 audio stream
    """
    # Generate cache key
    cache_key = hashlib.md5(
        f"{text}:{voice}:{speed}".encode()
    ).hexdigest()

    # TODO: Check Minio/S3 cache first
    # cached_audio = await get_cached_audio(cache_key)
    # if cached_audio:
    #     return StreamingResponse(cached_audio, media_type="audio/mpeg")

    # If not cached, synthesize and cache
    try:
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed,
            response_format="mp3",
        )

        audio_bytes = response.content

        # TODO: Store in Minio/S3 cache
        # await cache_audio(cache_key, audio_bytes)

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": f'inline; filename="{cache_key}.mp3"',
                "Cache-Control": "public, max-age=31536000",
                "X-Cache-Key": cache_key,
            }
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"TTS synthesis failed: {str(e)}"
        )
