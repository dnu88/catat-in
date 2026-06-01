from __future__ import annotations

from datetime import datetime, timezone
from threading import Lock
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
_jwks_cache: dict[str, object] = {"keys": [], "expires_at": 0.0}
_jwks_negative_kid_cache: dict[str, float] = {}
_jwks_lock = Lock()


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
            payload = response.json()
            keys = payload.get("keys", []) if isinstance(payload, dict) else []
            if isinstance(keys, list):
                return keys
        except (httpx.HTTPError, ValueError) as exc:
            last_error = exc

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Gagal mengambil JWKS Supabase.",
    ) from last_error


def _get_jwks_keys(force_refresh: bool = False) -> list[dict]:
    now = time.time()
    with _jwks_lock:
        cached_keys = _jwks_cache.get("keys")
        cached_expiry = float(_jwks_cache.get("expires_at") or 0)

        if (
            not force_refresh
            and isinstance(cached_keys, list)
            and cached_keys
            and cached_expiry > now
        ):
            return cached_keys

        keys = _fetch_jwks_keys()
        _jwks_cache["keys"] = keys
        _jwks_cache["expires_at"] = now + settings.SUPABASE_JWKS_CACHE_SECONDS
        return keys


def _is_kid_negatively_cached(kid: str) -> bool:
    expires_at = _jwks_negative_kid_cache.get(kid, 0.0)
    if expires_at > time.time():
        return True
    _jwks_negative_kid_cache.pop(kid, None)
    return False


def _remember_unknown_kid(kid: str) -> None:
    _jwks_negative_kid_cache[kid] = (
        time.time() + settings.SUPABASE_JWKS_NEGATIVE_CACHE_SECONDS
    )


def _get_unverified_header(token: str) -> dict:
    try:
        return jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        ) from exc


def _allowed_algorithms() -> set[str]:
    return {alg.upper() for alg in settings.SUPABASE_JWT_ALLOWED_ALGORITHMS}


def _reject_disallowed_algorithm(algorithm: str | None) -> str:
    normalized = (algorithm or "").upper()
    if not normalized or normalized not in _allowed_algorithms():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Algoritma token tidak diizinkan.",
        )
    return normalized


def _get_signing_key(token: str) -> tuple[object, list[str]]:
    header = _get_unverified_header(token)
    algorithm = _reject_disallowed_algorithm(header.get("alg"))
    token_kid = header.get("kid")

    if algorithm == "HS256":
        if not settings.SUPABASE_LEGACY_HS256_ENABLED:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid.",
            )
        jwt_secret = os.getenv("SUPABASE_JWT_SECRET")
        if jwt_secret:
            return jwt_secret, ["HS256"]

    if not token_kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    if _is_kid_negatively_cached(str(token_kid)):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    keys = _get_jwks_keys()
    signing_key = next((key for key in keys if key.get("kid") == token_kid), None)

    if not signing_key:
        # One bounded refresh handles key rotation without allowing every random
        # unknown kid to force outbound JWKS requests.
        signing_key = next(
            (key for key in _get_jwks_keys(force_refresh=True) if key.get("kid") == token_kid),
            None,
        )

    if not signing_key:
        _remember_unknown_kid(str(token_kid))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    key_type = signing_key.get("kty")
    key_alg = str(signing_key.get("alg") or algorithm).upper()
    if key_alg != algorithm:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    if key_type == "RSA":
        if algorithm not in {"RS256", "RS384", "RS512"}:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid.")
        return jwk.construct(signing_key, algorithm=algorithm).to_pem(), [algorithm]

    if key_type == "EC":
        if algorithm not in {"ES256", "ES384", "ES512"}:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token tidak valid.")
        return jwk.construct(signing_key, algorithm=algorithm).to_pem(), [algorithm]

    if key_type == "oct" and algorithm == "HS256" and settings.SUPABASE_LEGACY_HS256_ENABLED:
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
    return settings.SUPABASE_JWT_ISSUER or f"{_supabase_url()}/auth/v1"


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
            audience=settings.SUPABASE_JWT_AUDIENCE,
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
