"""
OpenAI TTS (Text-to-Speech) API endpoint
Provides high-quality, natural-sounding speech synthesis for story reading
"""

from __future__ import annotations

import hashlib
from io import BytesIO

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import StreamingResponse
from openai import AsyncOpenAI
from app.core.config import get_settings

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
) -> StreamingResponse:
    """
    Synthesize speech from text using OpenAI TTS API

    Args:
        text: Text to synthesize (max 4096 characters)
        voice: Voice to use (nova, shimmer, alloy)
        speed: Playback speed (0.25 to 4.0)

    Returns:
        MP3 audio stream
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

    try:
        # Call OpenAI TTS API
        response = await client.audio.speech.create(
            model="tts-1",  # Fast, high-quality model
            voice=voice,
            input=text,
            speed=speed,
            response_format="mp3",
        )

        # Stream audio response
        audio_bytes = BytesIO(response.content)

        return StreamingResponse(
            audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": 'inline; filename="speech.mp3"',
                "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
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
