"""
Test LLM Router with actual providers.
Validates Ollama (local), Gemini, and OpenAI connectivity.

Usage:
    python -m tests.test_llm_integration
    python -m tests.test_llm_integration --tier local
    python -m tests.test_llm_integration --tier mid
    python -m tests.test_llm_integration --tier high
    python -m tests.test_llm_integration --all
"""
from __future__ import annotations

import argparse
import asyncio
import sys
import time

PASS = 0
FAIL = 0


def check(desc: str, condition: bool, detail: str = ""):
    global PASS, FAIL
    if condition:
        print(f"  \033[32m✓\033[0m {desc}")
        PASS += 1
    else:
        print(f"  \033[31m✗\033[0m {desc} — {detail}")
        FAIL += 1


async def test_ollama():
    """Test Tier 1: Local Ollama."""
    from app.core.config import get_settings
    from app.services.llm_router import LLMRouter, RequestType

    settings = get_settings()
    print(f"\n[Tier 1: Ollama @ {settings.ollama_base_url}]")
    print(f"  Model: {settings.ollama_model}")

    router = LLMRouter()

    # Test 1: Simple word hint
    try:
        t0 = time.monotonic()
        result = await router.generate(
            request_type=RequestType.WORD_HINT,
            messages=[{"role": "user", "content": "Give a one-sentence hint for the word 'cat'."}],
            system_prompt="You are a children's English tutor. Reply in 1 short sentence.",
        )
        elapsed = int((time.monotonic() - t0) * 1000)
        check(f"Word hint ({elapsed}ms)", bool(result.text), result.text[:80])
        check("Tier is LOCAL", result.tier.value == "local")
        check("Has token counts", result.input_tokens > 0 or result.output_tokens > 0,
              f"in={result.input_tokens} out={result.output_tokens}")
    except Exception as e:
        check("Word hint", False, str(e))

    # Test 2: Phonics drill
    try:
        result = await router.generate(
            request_type=RequestType.PHONICS_DRILL,
            messages=[{"role": "user", "content": "Make 3 CVC words with short 'a' sound."}],
            system_prompt="Reply with only the words, one per line.",
        )
        check("Phonics drill", bool(result.text))
    except Exception as e:
        check("Phonics drill", False, str(e))

    # Test 3: Streaming
    try:
        chunks = []
        async for chunk in router.generate_stream(
            request_type=RequestType.WORD_HINT,
            messages=[{"role": "user", "content": "Say hello in a friendly way."}],
            system_prompt="You are a fairy. Reply in 1 sentence.",
        ):
            chunks.append(chunk)
        full = "".join(chunks)
        check(f"Streaming ({len(chunks)} chunks)", len(chunks) > 0 and len(full) > 0, full[:60])
    except Exception as e:
        check("Streaming", False, str(e))

    # Test 4: Child conversation prompt
    try:
        system = (
            "You are Star Fairy, a friendly fairy who speaks simple English. "
            "The child is in Phase 1, Month 1. "
            "Use sentences with maximum 5 words. "
            "Only use these words: hello, hi, I, am, my, name, is, you, are, good, morning. "
            "Never correct errors directly."
        )
        result = await router.generate(
            request_type=RequestType.WORD_HINT,
            messages=[{"role": "user", "content": "Hello!"}],
            system_prompt=system,
        )
        word_count = len(result.text.split())
        check(f"Child conversation ({word_count} words)", word_count <= 15,
              f"response: {result.text[:100]}")
    except Exception as e:
        check("Child conversation", False, str(e))

    await router.close()


async def test_gemini():
    """Test Tier 2: Gemini Flash."""
    from app.core.config import get_settings
    from app.services.llm_router import LLMRouter, RequestType

    settings = get_settings()
    print(f"\n[Tier 2: Gemini Flash]")
    print(f"  Model: {settings.gemini_model}")

    if not settings.gemini_api_key:
        print("  SKIP: GEMINI_API_KEY not set")
        return

    router = LLMRouter()

    try:
        t0 = time.monotonic()
        result = await router.generate(
            request_type=RequestType.SENTENCE_CORRECTION,
            messages=[{"role": "user", "content": "Fix this sentence: 'She go to school yesterday.'"}],
            system_prompt="You are an English grammar checker. Fix the sentence and explain briefly.",
        )
        elapsed = int((time.monotonic() - t0) * 1000)
        check(f"Sentence correction ({elapsed}ms)", bool(result.text), result.text[:80])
        check("Tier is MID", result.tier.value == "mid")
    except Exception as e:
        check("Sentence correction", False, str(e))

    try:
        result = await router.generate(
            request_type=RequestType.QUIZ_GENERATION,
            messages=[{
                "role": "user",
                "content": "Generate 3 comprehension questions for: 'The big red dog ran to the park. He played with a ball.'",
            }],
            system_prompt="Generate simple Who/What/Where questions for 7-year-olds. Reply as JSON array.",
        )
        check("Quiz generation", bool(result.text) and len(result.text) > 20, result.text[:100])
    except Exception as e:
        check("Quiz generation", False, str(e))

    try:
        summary_data = {
            "phonics_accuracy": 0.75,
            "sight_word_accuracy": 0.82,
            "sentence_accuracy": 0.6,
            "pronunciation_avg": 78.5,
            "total_lessons": 12,
            "streak": 5,
        }
        result = await router.generate(
            request_type=RequestType.PARENT_REPORT,
            messages=[{
                "role": "user",
                "content": f"Analyze this child's weekly learning data in Korean: {summary_data}",
            }],
            system_prompt="You are a children's English education specialist. Give 2-3 sentences of insight in Korean.",
        )
        check("Parent report (Korean)", bool(result.text), result.text[:100])
    except Exception as e:
        check("Parent report", False, str(e))

    await router.close()


async def test_high_tier():
    """Test Tier 3: Gemini Pro / OpenAI."""
    from app.core.config import get_settings
    from app.services.llm_router import LLMRouter, RequestType

    settings = get_settings()
    print(f"\n[Tier 3: High (Gemini Pro / OpenAI)]")

    has_gemini = bool(settings.gemini_api_key)
    has_openai = bool(settings.openai_api_key)

    if not has_gemini and not has_openai:
        print("  SKIP: No Tier 3 API keys set")
        return

    print(f"  Gemini Pro: {'available' if has_gemini else 'not set'}")
    print(f"  OpenAI: {'available' if has_openai else 'not set'}")

    router = LLMRouter()

    try:
        t0 = time.monotonic()
        result = await router.generate(
            request_type=RequestType.FREE_CONVERSATION,
            messages=[
                {"role": "user", "content": "Hello fairy!"},
                {"role": "assistant", "content": "Hello! I am Star Fairy!"},
                {"role": "user", "content": "I like cats."},
            ],
            system_prompt=(
                "You are Star Fairy. Speak simple English. Max 8 words per sentence. "
                "Only use: hello, I, am, like, cats, dogs, big, little, yes, you, are, nice, pretty, good."
            ),
        )
        elapsed = int((time.monotonic() - t0) * 1000)
        check(f"Free conversation ({elapsed}ms)", bool(result.text), result.text[:100])
        check(f"Used tier: {result.tier.value}", True)
    except Exception as e:
        check("Free conversation", False, str(e))

    try:
        result = await router.generate(
            request_type=RequestType.STORY_GENERATION,
            messages=[{
                "role": "user",
                "content": "Create a 3-sentence story about Apple Fairy and Star Cat for a 7-year-old.",
            }],
            system_prompt="Write at Phase 1 level. Use only CVC words and Pre-K sight words.",
        )
        check("Story generation", bool(result.text) and len(result.text) > 20, result.text[:100])
    except Exception as e:
        check("Story generation", False, str(e))

    await router.close()


async def test_fallback():
    """Test fallback chain behavior."""
    from app.services.llm_router import LLMRouter, RequestType

    print("\n[Fallback Chain]")
    router = LLMRouter()

    # High tier request should fall back through the chain
    try:
        result = await router.generate(
            request_type=RequestType.LEARNING_ANALYSIS,
            messages=[{"role": "user", "content": "Analyze: accuracy=80%, weak area=th digraph"}],
            system_prompt="Give 1 sentence recommendation.",
        )
        check(f"Fallback resolved to: {result.tier.value}/{result.model}", bool(result.text))
    except Exception as e:
        check("Fallback chain", False, str(e))

    await router.close()


async def main(tier: str):
    print("=== LLM Integration Test ===")

    if tier in ("local", "all"):
        await test_ollama()
    if tier in ("mid", "all"):
        await test_gemini()
    if tier in ("high", "all"):
        await test_high_tier()
    if tier == "all":
        await test_fallback()

    print(f"\n=== Results: {PASS} passed, {FAIL} failed ===\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tier", choices=["local", "mid", "high", "all"], default="all")
    args = parser.parse_args()
    asyncio.run(main(args.tier))
    sys.exit(FAIL)
