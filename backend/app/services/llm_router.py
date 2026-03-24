from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Any, AsyncIterator, Optional

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.models import LLMRequestLog, LLMTier

settings = get_settings()


class RequestType(str, Enum):
    WORD_HINT = "word_hint"
    PHONICS_DRILL = "phonics_drill"
    SIMPLE_TTS_TEXT = "simple_tts_text"
    SENTENCE_CORRECTION = "sentence_correction"
    QUIZ_GENERATION = "quiz_generation"
    PARENT_REPORT = "parent_report"
    FREE_CONVERSATION = "free_conversation"
    STORY_GENERATION = "story_generation"
    LEARNING_ANALYSIS = "learning_analysis"


_TIER_ROUTING: dict[RequestType, LLMTier] = {
    RequestType.WORD_HINT: LLMTier.LOCAL,
    RequestType.PHONICS_DRILL: LLMTier.LOCAL,
    RequestType.SIMPLE_TTS_TEXT: LLMTier.LOCAL,
    RequestType.SENTENCE_CORRECTION: LLMTier.MID,
    RequestType.QUIZ_GENERATION: LLMTier.MID,
    RequestType.PARENT_REPORT: LLMTier.MID,
    RequestType.FREE_CONVERSATION: LLMTier.MID,
    RequestType.STORY_GENERATION: LLMTier.HIGH,
    RequestType.LEARNING_ANALYSIS: LLMTier.HIGH,
}


@dataclass
class LLMResponse:
    text: str
    model: str
    tier: LLMTier
    input_tokens: int
    output_tokens: int
    latency_ms: int


class LLMRouter:
    def __init__(self) -> None:
        self._http = httpx.AsyncClient(timeout=httpx.Timeout(connect=5.0, read=60.0, write=10.0, pool=5.0))

    def resolve_tier(self, request_type: RequestType) -> LLMTier:
        return _TIER_ROUTING.get(request_type, LLMTier.MID)

    async def generate(
        self,
        request_type: RequestType,
        messages: list[dict[str, str]],
        system_prompt: Optional[str] = None,
        db: Optional[AsyncSession] = None,
        child_id: Optional[uuid.UUID] = None,
    ) -> LLMResponse:
        tier = self.resolve_tier(request_type)
        start = time.monotonic()

        fallback_chain = self._get_fallback_chain(tier)

        last_error: Optional[Exception] = None
        for provider_tier, model_name, call_fn in fallback_chain:
            try:
                text, in_tok, out_tok = await call_fn(messages, system_prompt)
                latency = int((time.monotonic() - start) * 1000)

                if db is not None:
                    db.add(LLMRequestLog(
                        child_id=child_id,
                        tier=provider_tier,
                        model_name=model_name,
                        request_type=request_type.value,
                        input_tokens=in_tok,
                        output_tokens=out_tok,
                        latency_ms=latency,
                        success=True,
                    ))

                return LLMResponse(
                    text=text,
                    model=model_name,
                    tier=provider_tier,
                    input_tokens=in_tok,
                    output_tokens=out_tok,
                    latency_ms=latency,
                )
            except Exception as exc:
                last_error = exc
                if db is not None:
                    db.add(LLMRequestLog(
                        child_id=child_id,
                        tier=provider_tier,
                        model_name=model_name,
                        request_type=request_type.value,
                        input_tokens=0,
                        output_tokens=0,
                        latency_ms=int((time.monotonic() - start) * 1000),
                        success=False,
                        error_message=str(exc),
                    ))
                continue

        raise RuntimeError(
            f"All LLM providers failed for tier={tier.value}"
        ) from last_error

    async def generate_stream(
        self,
        request_type: RequestType,
        messages: list[dict[str, str]],
        system_prompt: Optional[str] = None,
    ) -> AsyncIterator[str]:
        tier = self.resolve_tier(request_type)

        if tier == LLMTier.LOCAL:
            try:
                async for chunk in self._stream_ollama(messages, system_prompt):
                    yield chunk
            except Exception:
                yield "✨ Oops! My magic connection is a bit weak right now. Let's try again! 🌟"
        elif tier == LLMTier.MID:
            try:
                async for chunk in self._stream_gemini(
                    messages, system_prompt, settings.gemini_model
                ):
                    yield chunk
            except Exception:
                # Fallback to Ollama
                try:
                    async for chunk in self._stream_ollama(messages, system_prompt):
                        yield chunk
                except Exception:
                    yield "✨ Hmm... the fairy dust is running low. Let me rest for a second! 🧚‍♀️"
        else:
            try:
                async for chunk in self._stream_gemini(
                    messages, system_prompt, settings.gemini_pro_model
                ):
                    yield chunk
            except Exception:
                yield "✨ Hmm... the fairy dust is running low. Let me rest for a second! 🧚‍♀️"

    # ── Provider implementations ──────────────────────

    def _get_fallback_chain(
        self, tier: LLMTier
    ) -> list[tuple[LLMTier, str, Any]]:
        chain: list[tuple[LLMTier, str, Any]] = []

        if tier == LLMTier.LOCAL:
            chain.append((
                LLMTier.LOCAL,
                settings.ollama_model,
                self._call_ollama,
            ))
            if settings.gemini_api_key:
                chain.append((
                    LLMTier.MID,
                    settings.gemini_model,
                    lambda m, s: self._call_gemini(m, s, settings.gemini_model),
                ))

        elif tier == LLMTier.MID:
            if settings.gemini_api_key:
                chain.append((
                    LLMTier.MID,
                    settings.gemini_model,
                    lambda m, s: self._call_gemini(m, s, settings.gemini_model),
                ))
            if settings.openai_api_key:
                chain.append((
                    LLMTier.MID,
                    settings.openai_model,
                    self._call_openai,
                ))
            chain.append((
                LLMTier.LOCAL,
                settings.ollama_model,
                self._call_ollama,
            ))

        else:  # HIGH
            if settings.gemini_api_key:
                chain.append((
                    LLMTier.HIGH,
                    settings.gemini_pro_model,
                    lambda m, s: self._call_gemini(m, s, settings.gemini_pro_model),
                ))
            if settings.openai_api_key:
                chain.append((
                    LLMTier.HIGH,
                    settings.openai_model,
                    self._call_openai,
                ))
            if settings.gemini_api_key:
                chain.append((
                    LLMTier.MID,
                    settings.gemini_model,
                    lambda m, s: self._call_gemini(m, s, settings.gemini_model),
                ))

        return chain

    async def _call_ollama(
        self,
        messages: list[dict[str, str]],
        system_prompt: Optional[str],
    ) -> tuple[str, int, int]:
        payload: dict[str, Any] = {
            "model": settings.ollama_model,
            "messages": messages,
            "stream": False,
        }
        if system_prompt:
            payload["messages"] = [
                {"role": "system", "content": system_prompt},
                *messages,
            ]

        resp = await self._http.post(
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["message"]["content"]
        in_tok = data.get("prompt_eval_count", 0)
        out_tok = data.get("eval_count", 0)
        return text, in_tok, out_tok

    async def _call_gemini(
        self,
        messages: list[dict[str, str]],
        system_prompt: Optional[str],
        model: str,
    ) -> tuple[str, int, int]:
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        payload: dict[str, Any] = {"contents": contents}
        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent?key={settings.gemini_api_key}"
        )
        resp = await self._http.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()

        text = data["candidates"][0]["content"]["parts"][0]["text"]
        usage = data.get("usageMetadata", {})
        in_tok = usage.get("promptTokenCount", 0)
        out_tok = usage.get("candidatesTokenCount", 0)
        return text, in_tok, out_tok

    async def _call_openai(
        self,
        messages: list[dict[str, str]],
        system_prompt: Optional[str],
    ) -> tuple[str, int, int]:
        all_messages = []
        if system_prompt:
            all_messages.append({"role": "system", "content": system_prompt})
        all_messages.extend(messages)

        payload = {
            "model": settings.openai_model,
            "messages": all_messages,
        }

        resp = await self._http.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {settings.openai_api_key}"},
        )
        resp.raise_for_status()
        data = resp.json()
        text = data["choices"][0]["message"]["content"]
        usage = data.get("usage", {})
        in_tok = usage.get("prompt_tokens", 0)
        out_tok = usage.get("completion_tokens", 0)
        return text, in_tok, out_tok

    async def _stream_ollama(
        self,
        messages: list[dict[str, str]],
        system_prompt: Optional[str],
    ) -> AsyncIterator[str]:
        payload: dict[str, Any] = {
            "model": settings.ollama_model,
            "messages": messages,
            "stream": True,
        }
        if system_prompt:
            payload["messages"] = [
                {"role": "system", "content": system_prompt},
                *messages,
            ]

        async with self._http.stream(
            "POST",
            f"{settings.ollama_base_url}/api/chat",
            json=payload,
        ) as resp:
            if resp.status_code != 200:
                raise RuntimeError(f"Ollama stream error: {resp.status_code}")
            import json as json_mod

            async for line in resp.aiter_lines():
                if not line.strip():
                    continue
                data = json_mod.loads(line)
                if data.get("message", {}).get("content"):
                    yield data["message"]["content"]

    async def _stream_gemini(
        self,
        messages: list[dict[str, str]],
        system_prompt: Optional[str],
        model: str,
    ) -> AsyncIterator[str]:
        contents = []
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            contents.append({"role": role, "parts": [{"text": msg["content"]}]})

        payload: dict[str, Any] = {"contents": contents}
        if system_prompt:
            payload["systemInstruction"] = {
                "parts": [{"text": system_prompt}]
            }

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:streamGenerateContent?key={settings.gemini_api_key}&alt=sse"
        )
        async with self._http.stream("POST", url, json=payload) as resp:
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini stream error: {resp.status_code}")
            import json as json_mod

            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = json_mod.loads(line[6:])
                parts = (
                    data.get("candidates", [{}])[0]
                    .get("content", {})
                    .get("parts", [])
                )
                for part in parts:
                    if "text" in part:
                        yield part["text"]

    async def close(self) -> None:
        await self._http.aclose()


_router_instance: Optional[LLMRouter] = None


def get_llm_router() -> LLMRouter:
    global _router_instance
    if _router_instance is None:
        _router_instance = LLMRouter()
    return _router_instance
