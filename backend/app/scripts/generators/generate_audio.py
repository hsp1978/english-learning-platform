"""
Generate TTS audio files for all phonics phonemes and sight words.
Supports Google Cloud TTS, OpenAI TTS, or local edge-tts (free).

Usage:
    python -m app.scripts.generators.generate_audio --engine edge
    python -m app.scripts.generators.generate_audio --engine google
    python -m app.scripts.generators.generate_audio --engine openai
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

SEED_DIR = Path(__file__).parent.parent / "seed_data"


def _load_json(filename: str):
    with open(SEED_DIR / filename, encoding="utf-8") as f:
        return json.load(f)


def _collect_all_items() -> dict[str, list[str]]:
    """Collect all text items that need audio generation."""

    # Phonemes (individual letter sounds)
    phonemes = set()
    phonics_words_list = []
    pw = _load_json("phonics_words.json")
    for item in pw:
        phonics_words_list.append(item["word"])
        for p in item["phonemes"]:
            phonemes.add(p)

    # Sight words
    sight_words_list = []
    sw = _load_json("sight_words.json")
    for item in sw:
        sight_words_list.append(item["word"])

    # All unique words from sentence patterns
    sentence_words = set()
    sp = _load_json("sentence_patterns.json")
    for item in sp:
        for w in item["word_blocks"]:
            sentence_words.add(w.lower())

    # Combine all words
    all_words = sorted(set(phonics_words_list + sight_words_list + list(sentence_words)))

    return {
        "phonemes": sorted(phonemes),
        "words": all_words,
    }


async def _generate_edge_tts(
    text: str,
    output_path: Path,
    voice: str = "en-US-AnaNeural",
    rate: str = "-15%",
) -> bool:
    """Generate audio using edge-tts (free, no API key needed)."""
    try:
        import edge_tts
    except ImportError:
        print("  edge-tts not installed. Run: pip install edge-tts")
        return False

    try:
        communicate = edge_tts.Communicate(text, voice, rate=rate)
        await communicate.save(str(output_path))
        return True
    except Exception as e:
        print(f"  Error generating '{text}': {e}")
        return False


async def _generate_google_tts(
    text: str,
    output_path: Path,
) -> bool:
    """Generate audio using Google Cloud TTS API."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.google_tts_api_key:
        print("  GOOGLE_TTS_API_KEY not set")
        return False

    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://texttospeech.googleapis.com/v1/text:synthesize?key={settings.google_tts_api_key}",
            json={
                "input": {"text": text},
                "voice": {
                    "languageCode": "en-US",
                    "name": settings.google_tts_voice,
                },
                "audioConfig": {
                    "audioEncoding": "MP3",
                    "speakingRate": settings.google_tts_speaking_rate,
                    "pitch": 1.0,
                },
            },
        )
        if resp.status_code != 200:
            print(f"  Google TTS error for '{text}': {resp.status_code}")
            return False

        import base64

        audio_content = base64.b64decode(resp.json()["audioContent"])
        output_path.write_bytes(audio_content)
        return True


async def _generate_openai_tts(
    text: str,
    output_path: Path,
) -> bool:
    """Generate audio using OpenAI TTS API."""
    from app.core.config import get_settings

    settings = get_settings()
    if not settings.openai_api_key:
        print("  OPENAI_API_KEY not set")
        return False

    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.openai.com/v1/audio/speech",
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
            json={
                "model": "tts-1",
                "voice": "shimmer",
                "input": text,
                "speed": 0.85,
            },
        )
        if resp.status_code != 200:
            print(f"  OpenAI TTS error for '{text}': {resp.status_code}")
            return False

        output_path.write_bytes(resp.content)
        return True


async def generate_all(
    output_base: Path,
    engine: str = "edge",
    skip_existing: bool = True,
) -> None:
    items = _collect_all_items()

    phonemes_dir = output_base / "phonics"
    words_dir = output_base / "words"
    phonemes_dir.mkdir(parents=True, exist_ok=True)
    words_dir.mkdir(parents=True, exist_ok=True)

    engine_fn = {
        "edge": _generate_edge_tts,
        "google": _generate_google_tts,
        "openai": _generate_openai_tts,
    }.get(engine)

    if engine_fn is None:
        print(f"Unknown engine: {engine}. Use: edge, google, openai")
        return

    print(f"Engine: {engine}")
    print(f"Phonemes to generate: {len(items['phonemes'])}")
    print(f"Words to generate: {len(items['words'])}")
    print(f"Output: {output_base}")
    print()

    # Generate phoneme audio
    print("[Phonemes]")
    phoneme_ok = 0
    phoneme_skip = 0
    for phoneme in items["phonemes"]:
        safe = phoneme.replace("/", "").replace("\\", "").replace("ʃ", "sh").replace("θ", "th").replace("ð", "dh").replace("ŋ", "ng").replace("tʃ", "ch").replace("dʒ", "j").replace("ɛ", "eh").replace("æ", "ah").replace("ɪ", "ih").replace("ɒ", "oh").replace("ʌ", "uh").replace("ɜː", "er").replace("ɑː", "ar").replace("ɔː", "or").replace("iː", "ee").replace("uː", "oo").replace("oʊ", "oh").replace("aɪ", "ai").replace("eɪ", "ay").replace("juː", "yoo")
        if not safe:
            continue

        out_path = phonemes_dir / f"{safe}.mp3"
        if skip_existing and out_path.exists():
            phoneme_skip += 1
            continue

        # For phonemes, just speak the sound
        success = await engine_fn(phoneme, out_path)
        if success:
            phoneme_ok += 1

    print(f"  Generated: {phoneme_ok}, Skipped: {phoneme_skip}, Total: {len(items['phonemes'])}")

    # Generate word audio
    print("\n[Words]")
    word_ok = 0
    word_skip = 0
    for word in items["words"]:
        safe = word.lower().replace(" ", "_").replace("'", "")
        out_path = words_dir / f"{safe}.mp3"
        if skip_existing and out_path.exists():
            word_skip += 1
            continue

        success = await engine_fn(word, out_path)
        if success:
            word_ok += 1

    print(f"  Generated: {word_ok}, Skipped: {word_skip}, Total: {len(items['words'])}")

    # Generate SFX placeholder info
    sfx_dir = output_base / "sfx"
    sfx_dir.mkdir(parents=True, exist_ok=True)
    sfx_names = ["correct", "wrong", "unlock", "click", "coin", "levelup", "blend"]
    missing_sfx = [n for n in sfx_names if not (sfx_dir / f"{n}.mp3").exists()]
    if missing_sfx:
        print(f"\n[SFX] Missing sound effects (provide manually): {', '.join(missing_sfx)}")
        print(f"  Place .mp3 files in: {sfx_dir}/")

    print(f"\nDone. Total audio files: {phoneme_ok + word_ok} generated")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "audio",
    )
    parser.add_argument("--engine", choices=["edge", "google", "openai"], default="edge")
    parser.add_argument("--no-skip", action="store_true", help="Regenerate existing files")
    args = parser.parse_args()

    asyncio.run(generate_all(args.output_dir, args.engine, skip_existing=not args.no_skip))
