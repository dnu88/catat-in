from __future__ import annotations

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from jose.exceptions import ExpiredSignatureError
from jose.utils import base64url_decode
import json

from app.core.config import settings

_bearer = HTTPBearer(auto_error=False)


def _get_supabase_jwks_url() -> str:
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_URL belum dikonfigurasi.",
        )
    return f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/jwks"


def _get_signing_key(token: str) -> dict:
    try:
        header_segment = token.split(".")[0]
        header_data = base64url_decode(header_segment.encode("utf-8") + b"==")
        header = json.loads(header_data.decode("utf-8"))
        token_kid = header.get("kid")
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        ) from exc

    if not token_kid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )

    jwks_url = _get_supabase_jwks_url()
    try:
        response = httpx.get(jwks_url, timeout=5.0)
        response.raise_for_status()
        jwks = response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gagal mengambil JWKS Supabase.",
        ) from exc

    keys = jwks.get("keys", [])
    for key in keys:
        if key.get("kid") == token_kid:
            return key

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid.",
    )


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
        signing_key = _get_signing_key(token)
        key_type = signing_key.get("kty")

        if key_type == "RSA":
            key = jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(signing_key))
        elif key_type == "oct":
            key = signing_key.get("k")
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid.",
            )

        decoded = jwt.decode(
            token,
            key=key,
            algorithms=["RS256"],
            audience=settings.SUPABASE_URL,
            options={"verify_iat": True},
        )

        user_id = decoded.get("sub")
        email = decoded.get("email")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token tidak valid.",
            )

        return {
            "user_id": user_id,
            "email": email,
        }
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sudah kedaluwarsa.",
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token tidak valid.",
        )


def require_premium(current_user: dict = Depends(get_current_user)):
    """Placeholder: premium check via Supabase profiles table (TODO).
    Currently allows all authenticated users — implement plan_type check later."""
    return current_user
