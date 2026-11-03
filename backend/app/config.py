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
        env_file=(".env", "../.env"),
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

    # ── LLM (Gemini primary, Grok fallback, Plan C template safety net) ──
    llm_provider: str = "gemini"
    gemini_api_key: str = ""
    # Gemini 8-key failover pool (tried in order if one dies/quota exhausted)
    gemini_api_key_1: str = ""
    gemini_api_key_2: str = ""
    gemini_api_key_3: str = ""
    gemini_api_key_4: str = ""
    gemini_api_key_5: str = ""
    gemini_api_key_6: str = ""
    gemini_api_key_7: str = ""
    gemini_api_key_8: str = ""
    gemini_api_keys: str = ""  # Optional comma-separated list of keys
    gemini_model: str = "gemini-3.5-flash"  # Options: gemini-3.5-flash, gemini-3.5-flash-lite, gemini-3.8-flash, gemma-4

    # Grok (xAI) Fallback
    llm_fallback_provider: str = "grok"
    grok_api_key: str = ""
    grok_model: str = "grok-2-latest"
    grok_base_url: str = "https://api.x.ai/v1"

    # Compatibility aliases
    llm_api_key: str = ""
    llm_model: str = "gemini-3.5-flash"
    llm_timeout_seconds: int = 20
    llm_retry_count: int = 2
    llm_fallback_api_key: str = ""
    llm_fallback_model: str = "grok-2-latest"

    @property
    def all_gemini_api_keys(self) -> list[str]:
        """Collect all configured Gemini API keys (1-8+), removing blanks and duplicates."""
        keys: list[str] = []
        candidates = [
            self.gemini_api_key_1,
            self.gemini_api_key_2,
            self.gemini_api_key_3,
            self.gemini_api_key_4,
            self.gemini_api_key_5,
            self.gemini_api_key_6,
            self.gemini_api_key_7,
            self.gemini_api_key_8,
            self.gemini_api_key,
            self.llm_api_key,
        ]
        for k in candidates:
            val = (k or "").strip()
            if val and val not in keys:
                keys.append(val)
        if self.gemini_api_keys:
            for part in self.gemini_api_keys.split(","):
                val = part.strip()
                if val and val not in keys:
                    keys.append(val)
        return keys

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

    # SMTP / Live Email Delivery
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_from_email: str = "rojivadiyayug1@gmail.com"
    smtp_to_email: str = "rojivadiyayugpc@gmail.com"
    gmail_app_password: str = ""

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton — call this everywhere instead of constructing Settings."""
    return Settings()
