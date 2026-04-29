from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.firebase import get_firestore_client, verify_id_token

_bearer = HTTPBearer(auto_error=False)


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
        decoded = verify_id_token(token)
        return {
            "user_id": decoded.get("uid"),
            "email": decoded.get("email"),
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token Firebase tidak valid atau sudah kedaluwarsa.",
        )


def require_premium(current_user: dict = Depends(get_current_user)):
    db = get_firestore_client()
    profile = db.collection("users").document(current_user["user_id"]).get()
    profile_data = profile.to_dict() if profile.exists else {}
    if profile_data.get("plan_type") != "premium":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Fitur ini membutuhkan akun Premium",
        )
    return current_user
