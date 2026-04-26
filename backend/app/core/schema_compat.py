from functools import lru_cache

import httpx
from fastapi import HTTPException, status

from app.core.config import settings


@lru_cache
def _schema_definitions() -> dict:
    try:
        response = httpx.get(
            f"{settings.SUPABASE_URL}/rest/v1/",
            headers={
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                "Accept": "application/openapi+json",
            },
            timeout=15,
        )
        response.raise_for_status()
        return response.json().get("definitions", {})
    except Exception:
        return {}


def table_columns(table_name: str) -> set[str]:
    definition = _schema_definitions().get(table_name, {})
    properties = definition.get("properties", {})
    return set(properties.keys())


def has_columns(table_name: str, *columns: str) -> bool:
    available = table_columns(table_name)
    return all(column in available for column in columns)


def table_exists(table_name: str) -> bool:
    return bool(table_columns(table_name))


def require_tables(*table_names: str) -> None:
    missing = [table_name for table_name in table_names if not table_exists(table_name)]
    if missing:
        joined = ", ".join(missing)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Fitur ini belum aktif karena schema database belum lengkap. "
                f"Tabel yang belum ada: {joined}. "
                "Jalankan migration `backend/supabase/migrations/003_fix_schema.sql` "
                "di Supabase SQL Editor lalu coba lagi."
            ),
        )
