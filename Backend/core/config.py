"""Central application settings (12-factor style, loaded from environment / .env)."""
from __future__ import annotations

import logging
import secrets
from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_log = logging.getLogger(__name__)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=False
    )

    # --- general -----------------------------------------------------------
    app_name: str = "Study Buddy API"
    log_level: str = "INFO"
    frontend_url: str = "http://localhost:5173"
    # Comma separated list of allowed browser origins.
    cors_origins: str = "http://localhost:5173,http://localhost:3000"

    # --- database ----------------------------------------------------------
    # Use "mongomock://" for a throw-away in-memory database (demo/tests).
    mongodb_uri: str = "mongodb://localhost:27017"
    db_name: str = Field("study_buddy", validation_alias=AliasChoices("DB_NAME", "DATABASE"))

    # --- auth --------------------------------------------------------------
    secret_key: str = ""
    access_token_expire_minutes: int = 60
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = "http://localhost:8000/oauth/callback"
    # Comma separated list of e-mail addresses that get the instructor / admin role.
    instructor_emails: str = ""
    admin_emails: str = ""
    demo_mode: bool = False
    # Seed the demo dataset (idempotent) on startup. Intended for demo deployments.
    seed_demo_on_startup: bool = False

    # --- AI ----------------------------------------------------------------
    ai_provider: Literal["gemini", "openrouter"] = "gemini"
    gemini_api_key: str = Field("", validation_alias=AliasChoices("GEMINI_API_KEY", "GOOGLE_AI_KEY"))
    gemini_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 768
    openrouter_api_key: str = ""
    openrouter_model: str = "meta-llama/llama-3.3-70b-instruct:free"
    openrouter_base_url: str = "https://openrouter.ai/api/v1"
    ai_timeout_seconds: float = 60.0
    ai_max_input_chars: int = 8000
    # Global (all users) cap on AI requests per UTC day.
    ai_daily_request_cap: int = 500
    # Rough pricing used for the admin cost estimate (USD per 1M tokens). Free models cost 0.
    ai_cost_in_per_mtok: float = 0.30
    ai_cost_out_per_mtok: float = 2.50
    rag_top_k: int = 4

    # --- code runner -------------------------------------------------------
    code_runner: Literal["local", "judge0"] = "local"
    code_timeout_seconds: float = 5.0
    code_max_output_bytes: int = 65536
    code_memory_mb: int = 512
    code_max_procs: int = 256
    code_max_concurrency: int = 4
    code_max_source_bytes: int = 65536
    judge0_url: str = ""
    judge0_api_key: str = ""
    judge0_auth_header: str = "X-Auth-Token"

    # --- rate limits (per user, per minute) --------------------------------
    rate_limit_ai_per_minute: int = 20
    rate_limit_run_per_minute: int = 30
    rate_limit_auth_per_minute: int = 30

    # ----------------------------------------------------------------------
    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @property
    def instructor_emails_set(self) -> set[str]:
        return {e.strip().lower() for e in self.instructor_emails.split(",") if e.strip()}

    @property
    def admin_emails_set(self) -> set[str]:
        return {e.strip().lower() for e in self.admin_emails.split(",") if e.strip()}

    @property
    def google_login_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret)

    @property
    def ai_api_key(self) -> str:
        return self.gemini_api_key if self.ai_provider == "gemini" else self.openrouter_api_key

    @property
    def ai_configured(self) -> bool:
        return bool(self.ai_api_key)

    @property
    def jwt_algorithm(self) -> str:
        return "HS256"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.secret_key:
        # An ephemeral key keeps the app usable out of the box; tokens simply do
        # not survive a restart (and do not work across multiple workers).
        settings.secret_key = secrets.token_urlsafe(48)
        _log.warning("SECRET_KEY is not set; generated an ephemeral key. Set SECRET_KEY in production.")
    return settings


def reset_settings_cache() -> None:
    get_settings.cache_clear()
