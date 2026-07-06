"""
OpenAI TTS (Text-to-Speech) API endpoint
Provides high-quality, natural-sounding speech synthesis for story reading
"""

from __future__ import annotations

from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.services.tts_cache_service import TTSCacheRequest, get_tts_cache_service

router = APIRouter(prefix="/tts", tags=["tts"])

# Initialize OpenAI client
settings = get_settings()
client = AsyncOpenAI(api_key=settings.openai_api_key)

# Voice options for children's content
VOICES = {
    "shimmer": "shimmer",  # Warm, gentle voice for story narration
    "nova": "nova",        # Bright, friendly voice
    "alloy": "alloy",      # Neutral, clear voice
}

TTS_MODEL = "tts-1"


@router.post("/synthesize")
async def synthesize_speech(
    text: str,
    voice: str = "shimmer",
    speed: float = 0.88,
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """
    Synthesize speech from text using OpenAI TTS API with database caching

    Args:
        text: Text to synthesize (max 4096 characters)
        voice: Voice to use (shimmer, nova, alloy)
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
        voice = "shimmer"

    if speed < 0.25 or speed > 4.0:
        speed = 0.88

    cache_request = TTSCacheRequest(
        text=text.strip(),
        voice=voice,
        speed=speed,
        provider="openai",
        model_name=TTS_MODEL,
    )

    cached_audio = await get_tts_cache_service().get_cached_audio(db, cache_request)
    if cached_audio is not None:
        return StreamingResponse(
            BytesIO(cached_audio.audio_bytes),
            media_type=cached_audio.content_type,
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Cache-Control": "public, max-age=31536000",
                "X-Cache-Hit": "true",
                "X-Cache-Usage": str(cached_audio.usage_count),
                "X-Cache-Storage": cached_audio.storage,
            }
        )

    # Cache miss - generate new audio with OpenAI TTS
    try:
        response = await client.audio.speech.create(
            model=TTS_MODEL,  # Fast, high-quality model
            voice=voice,
            input=text,
            speed=speed,
            response_format="mp3",
        )

        audio_bytes = response.content

        try:
            await get_tts_cache_service().store_audio(db, cache_request, audio_bytes)
        except Exception as e:
            # Log cache storage error but still return the audio
            print(f"Cache storage error: {e}")

        return StreamingResponse(
            BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Cache-Control": "public, max-age=31536000",
                "X-Cache-Hit": "false",
                "X-Cache-Key": cache_request.text_hash,
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
    voice: str = "shimmer",
    speed: float = 0.88,
    db: AsyncSession = Depends(get_db),
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
    return await synthesize_speech(text=text, voice=voice, speed=speed, db=db)
