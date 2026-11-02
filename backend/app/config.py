# =============================================================================
# Veyronica — Application Configuration
# Single source of truth for all thresholds and environment settings.
# No rule is duplicated in prompts, UI code, or agent logic.
# =============================================================================
from __future__ import annotations

from decimal import Decimal
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    All configuration loaded from environment variables / .env file.
    Grouped by infrastructure layer with Plan A/B/C comments.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database (Plan A: Docker PG, Plan B: Local PG, Plan C: Neon/Supabase) ──
    database_url: str = "postgresql+asyncpg://veyronica:veyronica@localhost:5432/veyronica"
    database_url_sync: str = "postgresql://veyronica:veyronica@localhost:5432/veyronica"

    # ── Temporal (Plan A: local dev, Plan B: Docker, Plan C: Cloud) ──
    temporal_host: str = "localhost:7233"
    temporal_namespace: str = "default"
    temporal_task_queue: str = "replenishment"

    # ── LLM – Primary (Plan A) ──
    llm_provider: str = "openai"
    llm_api_key: str = ""
    llm_model: str = "gpt-4o"
    llm_timeout_seconds: int = 20
    llm_retry_count: int = 2

    # ── LLM – Fallback (Plan B) ──
    llm_fallback_provider: str = ""
    llm_fallback_api_key: str = ""
    llm_fallback_model: str = ""

    # ── Policy thresholds (Section 4, single source of truth) ──
    auto_approve_limit: Decimal = Decimal("10000")
    store_manager_limit: Decimal = Decimal("50000")
    reorder_cover_days: int = 6
    target_cover_days: int = 14
    lead_time_threshold_days: int = 7
    pack_size: int = 10

    # ── Server ──
    cors_origins: str = "http://localhost:5173"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — call this everywhere instead of constructing Settings."""
    return Settings()
