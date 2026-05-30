"""
Catat.in - Application Configuration
Semua environment variables dibaca dari sini menggunakan pydantic-settings.
"""

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Tuple, Type

from pydantic import field_validator, model_validator
from pydantic.fields import FieldInfo
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic_settings.sources import EnvSettingsSource, PydanticBaseSettingsSource


# Fields below are List[str] but we want to accept plain comma-separated strings
# from environment variables. Pydantic-settings normally tries to JSON-decode
# complex types from env; we bypass that for these specific fields and let the
# field_validator below parse raw string values instead.
_LIST_FIELDS_NO_JSON_DECODE = {"ALLOWED_ORIGINS", "ALLOWED_HOSTS"}

_REQUIRED_ALLOWED_ORIGINS: list[str] = [
    "https://catat-in-nine.vercel.app",
    "https://kaswise.com",
    "https://www.kaswise.com",
]

_REQUIRED_ALLOWED_HOSTS = [
    "localhost",
    "127.0.0.1",
    "kaswise.com",
    "www.kaswise.com",
]


class _ListFriendlyEnvSource(EnvSettingsSource):
    def prepare_field_value(
        self,
        field_name: str,
        field: FieldInfo,
        value: Any,
        value_is_complex: bool,
    ) -> Any:
        if field_name in _LIST_FIELDS_NO_JSON_DECODE and isinstance(value, str):
            return value
        return super().prepare_field_value(field_name, field, value, value_is_complex)


BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    APP_NAME: str = "Catat.in API"
    VERSION: str = "0.1.0"

    # Auth
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Anthropic
    ANTHROPIC_API_KEY: str | None = None
    ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

    # Midtrans
    MIDTRANS_SERVER_KEY: str | None = None
    MIDTRANS_CLIENT_KEY: str | None = None
    MIDTRANS_IS_PRODUCTION: bool = False

    # Supabase
    SUPABASE_URL: str | None = None
    SUPABASE_ANON_KEY: str | None = None
    SUPABASE_SERVICE_ROLE_KEY: str | None = None

    # CORS / trusted hosts. See _ListFriendlyEnvSource above.
    ALLOWED_ORIGINS: List[str] = [
        "https://catat-in-nine.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:3001",
    ]
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "kaswise.com", "www.kaswise.com"]
    CORS_ALLOW_CREDENTIALS: bool = False

    # Storage
    STORAGE_BUCKET_RECEIPTS: str = "receipts"
    STORAGE_BUCKET_AVATARS: str = "avatars"
    MAX_UPLOAD_SIZE_MB: int = 10

    # Rate limiting
    RATE_LIMIT_DEFAULT: int = 100
    RATE_LIMIT_AI_ENDPOINT: int = 20

    # Business rules
    FREE_TIER_RECEIPT_UPLOAD_LIMIT: int = 10
    FREE_TIER_BILL_REMINDER_LIMIT: int = 3
    FREE_TIER_IMPORT_MONTHS: int = 3
    FREE_TIER_MAX_TRANSACTIONS: int = 10_000
    PREMIUM_PRICE_MONTHLY_IDR: int = 29_000
    PREMIUM_PRICE_YEARLY_IDR: int = 249_000
    GROUP_MAX_MEMBERS: int = 10
    INVITE_LINK_EXPIRE_DAYS: int = 7

    @field_validator("DEBUG", "MIDTRANS_IS_PRODUCTION", "CORS_ALLOW_CREDENTIALS", mode="before")
    @classmethod
    def parse_bool_like_values(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "on", "debug", "development"}:
                return True
            if normalized in {"false", "0", "no", "off", "release", "production"}:
                return False
        return value

    @field_validator("ALLOWED_ORIGINS", "ALLOWED_HOSTS", mode="before")
    @classmethod
    def parse_list_like_values(cls, value):
        if isinstance(value, list):
            return [item.strip() for item in value if isinstance(item, str) and item.strip()]
        if isinstance(value, str):
            normalized = value.strip()
            if not normalized:
                return []
            if normalized.startswith("["):
                try:
                    parsed = json.loads(normalized)
                except json.JSONDecodeError:
                    parsed = None
                if isinstance(parsed, list):
                    return [str(item).strip() for item in parsed if str(item).strip()]
            return [item.strip() for item in normalized.split(",") if item.strip()]
        return value

    @model_validator(mode="after")
    def include_deployment_defaults(self):
        self.ALLOWED_ORIGINS = _dedupe_preserve_order([*self.ALLOWED_ORIGINS, *_REQUIRED_ALLOWED_ORIGINS])
        self.ALLOWED_HOSTS = _dedupe_preserve_order([*self.ALLOWED_HOSTS, *_REQUIRED_ALLOWED_HOSTS])
        return self

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return (
            init_settings,
            _ListFriendlyEnvSource(settings_cls),
            dotenv_settings,
            file_secret_settings,
        )


def _dedupe_preserve_order(values: List[str]) -> List[str]:
    seen = set()
    result = []
    for value in values:
        normalized = value.strip()
        if normalized and normalized not in seen:
            seen.add(normalized)
            result.append(normalized)
    return result


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
