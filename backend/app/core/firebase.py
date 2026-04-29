from __future__ import annotations

from typing import Any

import firebase_admin
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, firestore

from app.core.config import settings

_app: firebase_admin.App | None = None


def has_firebase_admin_config() -> bool:
    return bool(
        settings.FIREBASE_PROJECT_ID
        and settings.FIREBASE_CLIENT_EMAIL
        and settings.FIREBASE_PRIVATE_KEY
    )


def _build_service_account_info() -> dict[str, Any]:
    if not has_firebase_admin_config():
        raise RuntimeError(
            "Firebase Admin belum dikonfigurasi. Isi FIREBASE_PROJECT_ID, "
            "FIREBASE_CLIENT_EMAIL, dan FIREBASE_PRIVATE_KEY."
        )

    private_key = (settings.FIREBASE_PRIVATE_KEY or "").replace("\\n", "\n")

    return {
        "type": "service_account",
        "project_id": settings.FIREBASE_PROJECT_ID,
        "private_key": private_key,
        "client_email": settings.FIREBASE_CLIENT_EMAIL,
        "token_uri": "https://oauth2.googleapis.com/token",
    }


def get_firebase_app() -> firebase_admin.App:
    global _app
    if _app is not None:
        return _app

    if firebase_admin._apps:
        _app = firebase_admin.get_app()
        return _app

    cred = credentials.Certificate(_build_service_account_info())
    _app = firebase_admin.initialize_app(cred, {"projectId": settings.FIREBASE_PROJECT_ID})
    return _app


def get_firestore_client() -> firestore.Client:
    app = get_firebase_app()
    return firestore.client(app=app)


def verify_id_token(id_token: str) -> dict[str, Any]:
    app = get_firebase_app()
    return firebase_auth.verify_id_token(id_token, app=app)
