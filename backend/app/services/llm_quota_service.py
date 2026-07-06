from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

from app.core.config import get_settings
from app.core.redis import get_redis
from app.models.models import LLMTier

settings = get_settings()
COUNTER_TTL_SECONDS = 60 * 60 * 48


class LLMRateLimitExceeded(RuntimeError):
    pass


@dataclass(frozen=True)
class LLMQuotaDecision:
    allowed: bool
    fallback_to_local: bool = False
    reason: str | None = None


class LLMQuotaService:
    async def evaluate(
        self,
        child_id: uuid.UUID | None,
        requested_tier: LLMTier,
    ) -> LLMQuotaDecision:
        if child_id is None:
            return LLMQuotaDecision(allowed=True)

        usage = await self._get_usage(child_id)
        requests = int(usage.get("requests", 0))
        tokens = int(usage.get("tokens", 0))
        high_requests = int(usage.get("high_requests", 0))

        if requests >= settings.llm_daily_request_limit:
            return LLMQuotaDecision(
                allowed=False,
                reason="Daily LLM request limit exceeded",
            )

        if tokens >= settings.llm_daily_token_limit:
            return LLMQuotaDecision(
                allowed=True,
                fallback_to_local=requested_tier != LLMTier.LOCAL,
                reason="Daily LLM token limit exceeded",
            )

        if requested_tier == LLMTier.HIGH and high_requests >= settings.llm_daily_high_tier_limit:
            return LLMQuotaDecision(
                allowed=True,
                fallback_to_local=True,
                reason="Daily high-tier LLM limit exceeded",
            )

        return LLMQuotaDecision(allowed=True)

    async def reserve_request(self, child_id: uuid.UUID | None, tier: LLMTier) -> None:
        if child_id is None:
            return
        try:
            redis = await get_redis()
            key = self._key(child_id)
            pipe = redis.pipeline()
            pipe.hincrby(key, "requests", 1)
            if tier == LLMTier.HIGH:
                pipe.hincrby(key, "high_requests", 1)
            pipe.expire(key, COUNTER_TTL_SECONDS)
            await pipe.execute()
        except Exception:
            return

    async def record_tokens(
        self,
        child_id: uuid.UUID | None,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        if child_id is None:
            return
        try:
            redis = await get_redis()
            key = self._key(child_id)
            pipe = redis.pipeline()
            pipe.hincrby(key, "tokens", max(0, input_tokens) + max(0, output_tokens))
            pipe.expire(key, COUNTER_TTL_SECONDS)
            await pipe.execute()
        except Exception:
            return

    async def _get_usage(self, child_id: uuid.UUID) -> dict[str, int]:
        try:
            redis = await get_redis()
            raw = await redis.hgetall(self._key(child_id))
        except Exception:
            return {}
        return {str(k): int(v) for k, v in raw.items()}

    def _key(self, child_id: uuid.UUID) -> str:
        day = datetime.now(timezone.utc).strftime("%Y%m%d")
        return f"llm:usage:{child_id}:{day}"


_quota_service: LLMQuotaService | None = None


def get_llm_quota_service() -> LLMQuotaService:
    global _quota_service
    if _quota_service is None:
        _quota_service = LLMQuotaService()
    return _quota_service
