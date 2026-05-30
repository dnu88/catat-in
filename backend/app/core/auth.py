from __future__ import annotations

from datetime import datetime, timezone
import os
import time
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt
from jose.exceptions import ExpiredSignatureError
from jose.utils import base64url_decode

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)
_JWKS_CACHE_SECONDS = int(os.getenv("SUPABASE_JWKS_CACHE_SECONDS", "3600"))
_jwks_cache: dict[str, object] = {"keys": [], "expires_at": 0.0}


def _supabase_url() -> str:
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL belum dikonfigurasi.",
        )
    return settings.SUPABASE_URL.rstrip("/")


def _get_supabase_jwks_urls() -> list[str]:
    base_url = _supabase_url()
    return [
        f"{base_url}/auth/v1/.well-known/jwks.json",
        f"{base_url}/auth/v1/jwks",
    ]


def _fetch_jwks_keys() -> list[dict]:
    last_error: Exception | None = None
    for jwks_url in _get_supabase_jwks_urls():
        try:
            response = httpx.get(jwks_url, timeout=3.0)
            response.raise_for_status()
            keys = response.json().get("keys", [])
            if isinstance(keys, list):
                return keys
        except httpx.HTTPError as exc:
            last_error = exc

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Gagal mengambil JWKS Supabase.",
    ) from last_error


def _get_jwks_keys() -> list[dict]:
    now = time.time()
    cached_keys = _jwks_cache.get("keys")
    cached_expiry = float(_jwks_cache.get("expires_at") or 0)

    if isinstance(cached_keys, list) and cached_keys and cached_expiry > now:
        return cached_keys

    keys = _fetch_jwks_keys()
    _jwks_cache["keys"] = keys
    _jwks_cache["expires_at"] = now + _JWKS_CACHE_SECONDS
    return keys


def _get_unverified_header(token: str) -> dict:
    try:
        return jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        ) from exc


def _get_signing_key(token: str) -> tuple[object, list[str]]:
    header = _get_unverified_header(token)
    token_kid = header.get("kid")

    if not token_kid:
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if header.get("alg") == "HS256" and jwt_secret:
            return jwt_secret, ["HS256"]
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    if header.get("alg") == "HS256" and os.getenv("SUPABASE_JWT_SECRET"):
        return os.getenv("SUPABASE_JWT_SECRET"), ["HS256"]

    signing_key = next(
        (key for key in _get_jwks_keys() if key.get("kid") == token_kid),
        None,
    )

    if not signing_key:
        # One refresh handles key rotation without doing network I/O on every request.
        _jwks_cache["keys"] = []
        signing_key = next(
            (key for key in _get_jwks_keys() if key.get("kid") == token_kid),
            None,
        )

    if not signing_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    key_type = signing_key.get("kty")
    if key_type == "RSA":
        return jwk.construct(signing_key, algorithm="RS256").to_pem(), ["RS256"]

    if key_type == "oct":
        encoded_key = signing_key.get("k")
        if not encoded_key:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid.",
            )
        return base64url_decode(encoded_key.encode("utf-8") + b"=="), ["HS256"]

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid.",
    )


def _expected_issuer() -> str:
    return os.getenv("SUPABASE_JWT_ISSUER", f"{_supabase_url()}/auth/v1")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
):
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak ditemukan.",
        )

    token = credentials.credentials
    try:
        key, algorithms = _get_signing_key(token)
        decoded = jwt.decode(
            token,
            key=key,
            algorithms=algorithms,
            audience=os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated"),
            issuer=_expected_issuer(),
            options={"verify_iat": True},
        )

        user_id = decoded.get("sub")
        email = decoded.get("email")
        role = decoded.get("role")

        if role != "authenticated":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Role token tidak valid.",
            )

        UUID(str(user_id))

        return {
            "user_id": str(user_id),
            "email": email,
            "role": role,
        }
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa.",
        )
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )


def _get_supabase_service_client():
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None

    try:
        from supabase import create_client
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception:
        return None


def _is_active_premium_profile(profile: dict | None) -> bool:
    if not profile or profile.get("plan_type") != "premium":
        return False

    expires_at = profile.get("plan_expires_at")
    if not expires_at:
        return True

    try:
        normalized = str(expires_at).replace("Z", "+00:00")
        return datetime.fromisoformat(normalized) > datetime.now(timezone.utc)
    except ValueError:
        return False


def require_premium(current_user: dict = Depends(get_current_user)):
    client = _get_supabase_service_client()
    if not client:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Pemeriksaan premium belum tersedia.",
        )

    result = (
        client.table("profiles")
        .select("plan_type,plan_expires_at")
        .eq("id", current_user["user_id"])
        .limit(1)
        .execute()
    )
    profile = result.data[0] if isinstance(result.data, list) and result.data else None

    if not _is_active_premium_profile(profile):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fitur ini memerlukan akun Premium aktif.",
        )

    return current_user
