from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # ── App ──────────────────────────────────────────────
    app_name: str = Field(default="english-fairy-api")
    app_env: str = Field(default="development")
    app_debug: bool = Field(default=False)
    app_host: str = Field(default="0.0.0.0")
    app_port: int = Field(default=8000)
    app_secret_key: str = Field(default="change-me")
    app_cors_origins: List[str] = Field(default=["http://localhost:3000"])

    @field_validator("app_cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            import json
            return json.loads(v)
        return v

    # ── Database ─────────────────────────────────────────
    db_host: str = Field(default="localhost")
    db_port: int = Field(default=5432)
    db_user: str = Field(default="english_fairy")
    db_password: str = Field(default="change-me")
    db_name: str = Field(default="english_fairy")
    db_pool_size: int = Field(default=10)
    db_max_overflow: int = Field(default=20)

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+asyncpg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    @property
    def database_url_sync(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    # ── Redis ────────────────────────────────────────────
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)
    redis_password: str = Field(default="")

    @property
    def redis_url(self) -> str:
        auth = f":{self.redis_password}@" if self.redis_password else ""
        return f"redis://{auth}{self.redis_host}:{self.redis_port}/{self.redis_db}"

    # ── JWT ───────────────────────────────────────────────
    jwt_secret_key: str = Field(default="change-me")
    jwt_algorithm: str = Field(default="HS256")
    jwt_access_token_expire_minutes: int = Field(default=1440)
    jwt_refresh_token_expire_days: int = Field(default=30)

    # ── Parent PIN ────────────────────────────────────────
    parent_pin_hash_rounds: int = Field(default=12)

    # ── LLM Tier 1 (Local / Ollama) ──────────────────────
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="exaone3.5:7.8b")

    # ── LLM Tier 2 (Gemini Flash) ────────────────────────
    gemini_api_key: str = Field(default="")
    gemini_model: str = Field(default="gemini-2.0-flash")

    # ── LLM Tier 3 (Gemini Pro / OpenAI) ─────────────────
    gemini_pro_model: str = Field(default="gemini-3.1-pro")
    openai_api_key: str = Field(default="")
    openai_model: str = Field(default="gpt-4o")

    # ── Speech ────────────────────────────────────────────
    whisper_api_key: str = Field(default="")
    whisper_model: str = Field(default="whisper-1")
    google_tts_api_key: str = Field(default="")
    google_tts_voice: str = Field(default="en-US-Neural2-F")
    google_tts_speaking_rate: float = Field(default=0.85)

    # ── Storage ───────────────────────────────────────────
    s3_endpoint: str = Field(default="http://localhost:9000")
    s3_access_key: str = Field(default="minioadmin")
    s3_secret_key: str = Field(default="minioadmin")
    s3_bucket_audio: str = Field(default="english-fairy-audio")
    s3_bucket_images: str = Field(default="english-fairy-images")
    s3_region: str = Field(default="us-east-1")


@lru_cache
def get_settings() -> Settings:
    return Settings()
