"""
Pre-generate TTS audio for story words and sentences

This script extracts all words and sentences from "The Lost Teddy" story
and pre-generates audio files to populate the TTS cache, reducing API costs
and improving response time for users.
"""

from __future__ import annotations

import asyncio
import base64
import hashlib
import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from openai import AsyncOpenAI
from sqlalchemy import select

from app.core.config import get_settings
from app.core.database import async_session_factory
from app.models.models import Story, StoryPage, TTSAudioCache


async def generate_audio(client: AsyncOpenAI, text: str, voice: str = "nova", speed: float = 1.0):
    """Generate audio using OpenAI TTS"""
    try:
        response = await client.audio.speech.create(
            model="tts-1",
            voice=voice,
            input=text,
            speed=speed,
            response_format="mp3",
        )
        return response.content
    except Exception as e:
        print(f"Error generating audio for '{text}': {e}")
        return None


async def cache_audio(db, text: str, audio_bytes: bytes, voice: str = "nova", speed: float = 1.0):
    """Store audio in database cache"""
    text_hash = hashlib.md5(
        f"{text.strip().lower()}:{voice}:{speed}".encode()
    ).hexdigest()

    # Check if already cached
    result = await db.execute(
        select(TTSAudioCache).where(TTSAudioCache.text_hash == text_hash)
    )
    existing = result.scalar_one_or_none()

    if existing:
        print(f"  ✓ Already cached: {text[:50]}")
        return False

    # Create new cache entry
    try:
        audio_b64 = base64.b64encode(audio_bytes).decode('utf-8')
        cache_entry = TTSAudioCache(
            text_content=text[:500],
            text_hash=text_hash,
            voice=voice,
            speed=speed,
            audio_data=audio_b64,
            audio_size_bytes=len(audio_bytes),
            usage_count=0,
        )
        db.add(cache_entry)
        await db.commit()
        print(f"  ✓ Cached: {text[:50]}")
        return True
    except Exception as e:
        print(f"  ✗ Failed to cache '{text}': {e}")
        await db.rollback()
        return False


async def main():
    """Main function to pre-generate audio for The Lost Teddy story"""
    settings = get_settings()
    client = AsyncOpenAI(api_key=settings.openai_api_key)

    print("=" * 60)
    print("Pre-generating TTS Audio for 'The Lost Teddy' Story")
    print("=" * 60)

    async with async_session_factory() as db:
        # Get The Lost Teddy story
        result = await db.execute(
            select(Story).where(Story.title == "The Lost Teddy")
        )
        story = result.scalar_one_or_none()

        if not story:
            print("Error: Story 'The Lost Teddy' not found in database")
            return

        print(f"\nFound story: {story.title} (ID: {story.id})")

        # Get all pages
        result = await db.execute(
            select(StoryPage)
            .where(StoryPage.story_id == story.id)
            .order_by(StoryPage.page_number)
        )
        pages = result.scalars().all()

        print(f"Found {len(pages)} pages\n")

        # Extract all unique words and sentences
        all_words = set()
        all_sentences = []

        for page in pages:
            # Add full page text as a sentence
            all_sentences.append(page.text_content)

            # Extract individual words
            words = page.text_content.split()
            for word in words:
                # Clean word (remove punctuation)
                clean_word = word.strip('.,!?;:"\'').lower()
                if clean_word:
                    all_words.add(clean_word)

        print(f"Extracted {len(all_words)} unique words")
        print(f"Extracted {len(all_sentences)} sentences")

        # Generate audio for all words
        print("\n" + "=" * 60)
        print("Generating audio for WORDS")
        print("=" * 60)

        cached_count = 0
        for i, word in enumerate(sorted(all_words), 1):
            print(f"[{i}/{len(all_words)}] {word}")
            audio_bytes = await generate_audio(client, word)
            if audio_bytes:
                success = await cache_audio(db, word, audio_bytes)
                if success:
                    cached_count += 1
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.1)

        print(f"\n✓ Cached {cached_count} new words")

        # Generate audio for all sentences
        print("\n" + "=" * 60)
        print("Generating audio for SENTENCES")
        print("=" * 60)

        cached_count = 0
        for i, sentence in enumerate(all_sentences, 1):
            print(f"[{i}/{len(all_sentences)}] Page {i}")
            print(f"  Text: {sentence[:60]}...")
            audio_bytes = await generate_audio(client, sentence)
            if audio_bytes:
                success = await cache_audio(db, sentence, audio_bytes)
                if success:
                    cached_count += 1
            # Small delay to avoid rate limiting
            await asyncio.sleep(0.2)

        print(f"\n✓ Cached {cached_count} new sentences")

        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)

        result = await db.execute(select(TTSAudioCache))
        total_cached = len(result.scalars().all())

        print(f"Total entries in TTS cache: {total_cached}")
        print(f"Story words: {len(all_words)}")
        print(f"Story sentences: {len(all_sentences)}")
        print("\n✓ Pre-generation complete!")


if __name__ == "__main__":
    asyncio.run(main())
